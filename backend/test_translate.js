const axios = require('axios');
async function translate() {
  const q = 'Hola, como estas?';
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(q)}`;
  const res = await axios.get(url);
  console.log(res.data[0].map(x => x[0]).join(''));
}
translate();
