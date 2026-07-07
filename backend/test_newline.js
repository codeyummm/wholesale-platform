const code = "Model: Pixel 10 Pro XL Porcelain 256GB (<span style=\"color: green\">Unlocked</span>)<br>IMEI: 357006523673644<br>IMEI2: 357006523673651";
let codeText = code.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
console.log(JSON.stringify(codeText));
