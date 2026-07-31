const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

// 1. Replace State
content = content.replace(
  /const \[ebayPolicies, setEbayPolicies\][\s\S]*?const \[nanoSettings, setNanoSettings\]/m,
  `const [templates, setTemplates] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [saveAsDefault, setSaveAsDefault] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [nanoSettings, setNanoSettings]`
);

// 2. Replace formData defaults
content = content.replace(
  /returnProfileId: '',[\s\S]*?paymentProfileId: '' },/m,
  `handlingTime: 1,
        shippingService: 'USPSPriority',
        shippingCost: 0.0,
        returnsAccepted: true,
        returnPeriod: 30,
        paymentMethod: 'PAYPAL',`
);

// 3. Replace fetchEbayPolicies
content = content.replace(
  /const fetchEbayPolicies = async \(\) => {[\s\S]*?};/m,
  `const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const res = await api.get('/ebay/native-profiles');
      if (res.data.success) {
        setTemplates(res.data.profiles);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };`
);

// 4. Update useEffect activeTab
content = content.replace(
  /fetchEbayPolicies\(\);/g,
  `fetchTemplates();`
);

// 5. Replace handleSaveProfile
content = content.replace(
  /const handleSaveProfile = async \(e\) => {[\s\S]*?};/m,
  `const handleSaveTemplate = async () => {
    if (!templateName.trim()) return alert('Please enter a template name');
    try {
      setSavingTemplate(true);
      const configuration = {
        handlingTime: formData.platformSettings.ebay.handlingTime,
        shippingService: formData.platformSettings.ebay.shippingService,
        shippingCost: formData.platformSettings.ebay.shippingCost,
        returnsAccepted: formData.platformSettings.ebay.returnsAccepted,
        returnPeriod: formData.platformSettings.ebay.returnPeriod,
        paymentMethod: formData.platformSettings.ebay.paymentMethod
      };
      const res = await api.post('/ebay/native-profiles', {
        name: templateName,
        type: 'TEMPLATE',
        configuration,
        saveAsDefault
      });
      if (res.data.success) {
        setTemplateName('');
        fetchTemplates();
        alert('Template saved successfully!');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };
  
  const handleLoadTemplate = (e) => {
    const t = templates.find(temp => temp._id === e.target.value);
    if (!t || !t.configuration) return;
    setFormData(prev => ({
      ...prev,
      platformSettings: {
        ...prev.platformSettings,
        ebay: {
          ...prev.platformSettings.ebay,
          ...t.configuration
        }
      }
    }));
  };`
);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
