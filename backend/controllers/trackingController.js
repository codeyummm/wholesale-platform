const { trackFedexShipment } = require('../services/fedexService');
const { trackUpsShipment } = require('../services/upsService');
const { trackUspsShipment } = require('../services/uspsService');

const fetchLiveTracking = async (carrier, trackingNumber) => {
  if (!trackingNumber) {
    throw new Error('Tracking number is required');
  }

  if (carrier.toLowerCase().includes('fedex')) {
    const trackData = await trackFedexShipment(trackingNumber);
    if (!trackData) throw new Error('Tracking data not found for this number');
    trackData.serviceType = trackData.serviceDetail?.description || trackData.serviceCommitMessage?.message || 'Standard Shipping';
    return trackData;
  } else if (carrier.toLowerCase().includes('ups')) {
    const trackData = await trackUpsShipment(trackingNumber);
    if (!trackData) throw new Error('Tracking data not found for this number');

    const mappedData = {
       serviceType: trackData.service?.description || trackData.package?.[0]?.service?.description || 'Standard Shipping',
       latestStatusDetail: {
          statusByLocale: trackData.package?.[0]?.activity?.[0]?.status?.description || 'Origin'
       },
       scanEvents: []
    };

    if (trackData.package && trackData.package[0] && trackData.package[0].activity) {
       mappedData.scanEvents = trackData.package[0].activity.map(act => {
          let formattedDate = act.date;
          let formattedTime = act.time || '';
          if (act.date && act.date.length === 8) {
             formattedDate = `${act.date.substring(0,4)}-${act.date.substring(4,6)}-${act.date.substring(6,8)}`;
          }
          if (act.time && act.time.length >= 6) {
             formattedTime = `${act.time.substring(0,2)}:${act.time.substring(2,4)}:${act.time.substring(4,6)}`;
          }

          return {
             eventDescription: act.status?.description || 'Scanned',
             date: formattedDate,
             time: formattedTime,
             scanLocation: {
                city: act.location?.address?.city || '',
                stateOrProvinceCode: act.location?.address?.stateProvince || '',
                countryCode: act.location?.address?.country || ''
             }
          };
       });
    }
    return mappedData;

  } else if (carrier.toLowerCase().includes('usps')) {
    const trackData = await trackUspsShipment(trackingNumber);
    if (!trackData) throw new Error('Tracking data not found for this number');

    const mappedData = {
       serviceType: trackData.expectedDeliveryType || trackData.mailClass || trackData.mailClassDescription || 'Standard Shipping',
       latestStatusDetail: {
          statusByLocale: trackData.statusCategory || trackData.statusSummary || trackData.trackingEvents?.[0]?.eventDescription || 'Origin'
       },
       scanEvents: []
    };

    if (trackData.trackingEvents && Array.isArray(trackData.trackingEvents)) {
       mappedData.scanEvents = trackData.trackingEvents.map(act => {
          return {
             eventDescription: act.eventDescription || 'Scanned',
             date: act.eventDate ? act.eventDate : '',
             time: act.eventTime ? act.eventTime : '',
             scanLocation: {
                city: act.eventCity || act.scanLocation?.city || '',
                stateOrProvinceCode: act.eventState || act.scanLocation?.stateOrProvinceCode || '',
                countryCode: 'US'
             }
          };
       });
    }
    return mappedData;
  } else {
    throw new Error(`Integration for carrier ${carrier} is not set up yet`);
  }
};

exports.fetchLiveTracking = fetchLiveTracking;

exports.getTrackingInfo = async (req, res) => {
  try {
    const { carrier, trackingNumber } = req.params;
    const data = await fetchLiveTracking(carrier, trackingNumber);
    res.json(data);
  } catch (error) {
    console.error('Tracking Controller Error:', error.message);
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: error.message || 'Server error fetching tracking info' });
  }
};
