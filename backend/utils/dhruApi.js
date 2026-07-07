class DhruFusionAPI {
  constructor(url, username, apiKey) {
    this.url = url;
    this.username = username;
    this.apiKey = apiKey;
  }

  async action(actionName, parameters = {}) {
    try {
      let parametersXML = '';
      if (parameters && Object.keys(parameters).length > 0) {
        parametersXML = '<PARAMETERS>';
        for (const [key, value] of Object.entries(parameters)) {
          parametersXML += `<${key}>${value}</${key}>`;
        }
        parametersXML += '</PARAMETERS>';
      }

      const payload = new URLSearchParams({
        username: this.username,
        apiaccesskey: this.apiKey,
        action: actionName,
        requestformat: 'JSON',
        ...(parametersXML ? { parameters: parametersXML } : {})
      });

      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: payload.toString()
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Dhru API Error [${actionName}]:`, error.message);
      throw error;
    }
  }
}

module.exports = DhruFusionAPI;
