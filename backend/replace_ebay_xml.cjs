const fs = require('fs');
let content = fs.readFileSync('backend/services/ebayListingService.js', 'utf8');

const targetRegex = /const \{ categoryId, conditionId, returnProfileId, shippingProfileId, paymentProfileId \} = ebaySettings;\s+const \{ useSandboxTest = false \} = syncOptions;\s+\/\/ Choose between VerifyAddItem[\s\S]*?<\/SellerShippingProfile>\s+<\/SellerProfiles>\s+<\/Item>\s+<\/\$\{callName\}Request>`;/;

const replacementContent = `const { 
      categoryId, storeCategoryId, conditionId, conditionDescription,
      format, duration, bestOfferEnabled, bestOfferAutoAccept, bestOfferAutoDecline,
      itemSpecifics, handlingTime, shippingService, shippingCost,
      returnsAccepted, returnPeriod, paymentMethod,
      packageWeightLbs, packageWeightOz, packageLength, packageWidth, packageDepth,
      zipCode, scheduleListing, scheduleDate, scheduleTime, scheduleAmPm, shippingOptions,
      returnProfileId, shippingProfileId, paymentProfileId 
    } = ebaySettings;
    
    const { useSandboxTest = false } = syncOptions;
    
    // Choose between VerifyAddItem (test only, no fees) and AddItem (actually lists)
    const callName = useSandboxTest ? 'VerifyAddItem' : 'AddItem';

    let itemSpecificsXML = '';
    if (itemSpecifics && Object.keys(itemSpecifics).length > 0) {
      itemSpecificsXML = '<ItemSpecifics>';
      for (const [key, value] of Object.entries(itemSpecifics)) {
         itemSpecificsXML += \`<NameValueList><Name><![CDATA[\${key}]]></Name><Value><![CDATA[\${value}]]></Value></NameValueList>\`;
      }
      itemSpecificsXML += '</ItemSpecifics>';
    }

    let packageDetailsXML = '';
    if (packageWeightLbs !== undefined || packageWeightOz !== undefined) {
      packageDetailsXML = \`
      <ShippingPackageDetails>
        <WeightMajor unit="lbs">\${packageWeightLbs || 0}</WeightMajor>
        <WeightMinor unit="oz">\${packageWeightOz || 0}</WeightMinor>
        \${packageLength ? \`<PackageLength unit="in">\${packageLength}</PackageLength>\` : ''}
        \${packageWidth ? \`<PackageWidth unit="in">\${packageWidth}</PackageWidth>\` : ''}
        \${packageDepth ? \`<PackageDepth unit="in">\${packageDepth}</PackageDepth>\` : ''}
        <ShippingPackage>PackageThickEnvelope</ShippingPackage>
      </ShippingPackageDetails>\`;
    }

    let bestOfferXML = '';
    if (bestOfferEnabled) {
      bestOfferXML = \`
      <BestOfferDetails>
        <BestOfferEnabled>true</BestOfferEnabled>
      </BestOfferDetails>
      <ListingDetails>
        \${bestOfferAutoAccept ? \`<BestOfferAutoAcceptPrice>\${bestOfferAutoAccept}</BestOfferAutoAcceptPrice>\` : ''}
        \${bestOfferAutoDecline ? \`<BestOfferAutoDeclinePrice>\${bestOfferAutoDecline}</BestOfferAutoDeclinePrice>\` : ''}
      </ListingDetails>\`;
    }

    // Rough conversion for Schedule Time (eBay expects UTC ISO8601 like 2026-07-25T14:00:00.000Z)
    let scheduleXML = '';
    if (scheduleListing && scheduleDate && scheduleTime) {
      // Very basic local-to-UTC approximation or just push the string if formatted correctly.
      // E.g. scheduleDate = 2026-07-25, scheduleTime = 14:00
      scheduleXML = \`<ScheduleTime>\${scheduleDate}T\${scheduleTime}:00.000Z</ScheduleTime>\`;
    }

    // Add optional StoreCategoryId if provided
    const storeCategoryXML = storeCategoryId ? \`<Storefront><StoreCategoryID>\${storeCategoryId}</StoreCategoryID></Storefront>\` : '';
    const condDescXML = (conditionId && conditionId !== '1000' && conditionDescription) ? \`<ConditionDescription><![CDATA[\${conditionDescription}]]></ConditionDescription>\` : '';

    const xmlPayload = \`<?xml version="1.0" encoding="utf-8"?>
<\${callName}Request xmlns="urn:ebay:apis:eBLBaseComponents">
  <ErrorLanguage>en_US</ErrorLanguage>
  <WarningLevel>High</WarningLevel>
  <Item>
    <Title><![CDATA[\${listing.title.substring(0, 80)}]]></Title>
    <Description><![CDATA[\${listing.description || listing.title}]]></Description>
    <PrimaryCategory>
      <CategoryID>\${categoryId || '9355'}</CategoryID>
    </PrimaryCategory>
    \${storeCategoryXML}
    <StartPrice currencyID="USD">\${listing.price}</StartPrice>
    <ConditionID>\${conditionId || '3000'}</ConditionID>
    \${condDescXML}
    <Country>US</Country>
    <Currency>USD</Currency>
    <DispatchTimeMax>\${handlingTime || 1}</DispatchTimeMax>
    <ListingDuration>\${duration || 'GTC'}</ListingDuration>
    <ListingType>\${format || 'FixedPriceItem'}</ListingType>
    <PostalCode>\${zipCode || '90210'}</PostalCode>
    <Quantity>\${listing.quantity || 1}</Quantity>
    
    \${listing.sku ? \`<SKU>\${listing.sku}</SKU>\` : ''}
    
    <PictureDetails>
      <PictureURL>\${listing.images && listing.images.length > 0 ? listing.images[0].url : 'https://example.com/placeholder.jpg'}</PictureURL>
    </PictureDetails>

    \${itemSpecificsXML}
    \${bestOfferXML}
    \${scheduleXML}

    <ShippingDetails>
      \${packageDetailsXML}
      \${shippingOptions?.internationalShipping ? '<GlobalShipping>true</GlobalShipping>' : ''}
    </ShippingDetails>

    <SellerProfiles>
      <SellerPaymentProfile>
        <PaymentProfileID>\${paymentProfileId || '0'}</PaymentProfileID>
      </SellerPaymentProfile>
      <SellerReturnProfile>
        <ReturnProfileID>\${returnProfileId || '0'}</ReturnProfileID>
      </SellerReturnProfile>
      <SellerShippingProfile>
        <ShippingProfileID>\${shippingProfileId || '0'}</ShippingProfileID>
      </SellerShippingProfile>
    </SellerProfiles>
  </Item>
</\${callName}Request>\`;`;

content = content.replace(targetRegex, replacementContent);
fs.writeFileSync('backend/services/ebayListingService.js', content);
