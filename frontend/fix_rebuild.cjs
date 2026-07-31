const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');
// Fix replace_listing_editor logic
content = content.replace(
  /const \[ebayPolicies, setEbayPolicies\][\s\S]*?const \[nanoSettings, setNanoSettings\]/m,
  `const [templates, setTemplates] = useState([]);\n  const [loadingTemplates, setLoadingTemplates] = useState(false);\n  const [templateName, setTemplateName] = useState('');\n  const [saveAsDefault, setSaveAsDefault] = useState(false);\n  const [savingTemplate, setSavingTemplate] = useState(false);\n  const [nanoSettings, setNanoSettings]`
);

// We need to replace the formData defaults. In git it looks like:
// ebay:    { categoryId: '9355', conditionId: '3000', returnProfileId: '', shippingProfileId: '', paymentProfileId: '' },
content = content.replace(
  /ebay:\s*\{\s*categoryId:\s*'9355',\s*conditionId:\s*'3000',\s*returnProfileId:\s*'',\s*shippingProfileId:\s*'',\s*paymentProfileId:\s*''\s*\}/m,
  `ebay: { categoryId: '9355', conditionId: '3000', handlingTime: 1, shippingService: 'USPSPriority', shippingCost: 0.0, returnsAccepted: true, returnPeriod: 30, paymentMethod: 'PAYPAL' }`
);

content = content.replace(
  /const fetchEbayPolicies = async \(\) => {[\s\S]*?};/m,
  `const fetchTemplates = async () => {\n    try {\n      setLoadingTemplates(true);\n      const res = await api.get('/ebay/native-profiles');\n      if (res.data.success) {\n        setTemplates(res.data.profiles);\n      }\n    } catch (err) {\n      console.error("Failed to load templates:", err);\n    } finally {\n      setLoadingTemplates(false);\n    }\n  };`
);

content = content.replace(/fetchEbayPolicies\(\);/g, `fetchTemplates();`);

content = content.replace(
  /const handleSaveProfile = async \(e\) => {[\s\S]*?};/m,
  `const handleSaveTemplate = async () => {\n    if (!templateName.trim()) return alert('Please enter a template name');\n    try {\n      setSavingTemplate(true);\n      const configuration = {\n        handlingTime: formData.platformSettings.ebay.handlingTime,\n        shippingService: formData.platformSettings.ebay.shippingService,\n        shippingCost: formData.platformSettings.ebay.shippingCost,\n        returnsAccepted: formData.platformSettings.ebay.returnsAccepted,\n        returnPeriod: formData.platformSettings.ebay.returnPeriod,\n        paymentMethod: formData.platformSettings.ebay.paymentMethod\n      };\n      const res = await api.post('/ebay/native-profiles', {\n        name: templateName,\n        type: 'TEMPLATE',\n        configuration,\n        saveAsDefault\n      });\n      if (res.data.success) {\n        setTemplateName('');\n        fetchTemplates();\n        alert('Template saved successfully!');\n      }\n    } catch (err) {\n      console.error(err);\n      alert('Failed to save template');\n    } finally {\n      setSavingTemplate(false);\n    }\n  };\n  \n  const handleLoadTemplate = (e) => {\n    const t = templates.find(temp => temp._id === e.target.value);\n    if (!t || !t.configuration) return;\n    setFormData(prev => ({\n      ...prev,\n      platformSettings: {\n        ...prev.platformSettings,\n        ebay: {\n          ...prev.platformSettings.ebay,\n          ...t.configuration\n        }\n      }\n    }));\n  };`
);

fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Rebuilt base editor');
