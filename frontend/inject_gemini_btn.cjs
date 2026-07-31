const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

const regex = /<button[\s\S]*?id="autofill-btn"[\s\S]*?<\/button>/;

const newButtons = `<div className="flex items-center space-x-2">
                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           
                           try {
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Fetching...';
                              
                              const res = await fetch(\`http://localhost:5000/api/ebay/catalog/search?q=\${encodeURIComponent(formData.title)}\`, {
                                headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill from eBay';
                              
                              if (data.success && data.itemSpecifics) {
                                 const currentSpecs = formData.platformSettings?.ebay?.itemSpecifics || {};
                                 const newSpecs = { ...currentSpecs };
                                 let addedCount = 0;
                                 
                                 for (const [k, v] of Object.entries(data.itemSpecifics)) {
                                   if (!newSpecs[k]) {
                                     newSpecs[k] = v;
                                     addedCount++;
                                   }
                                 }
                                 
                                 if (addedCount > 0) {
                                   handlePlatformChange('ebay', 'itemSpecifics', newSpecs);
                                   alert(\`Auto-filled \${addedCount} item specific(s) successfully!\`);
                                 } else {
                                   alert('No new specifics found or all fields were already filled.');
                                 }
                              } else {
                                 alert(data.message || 'Could not find matching device in catalog.');
                              }
                           } catch (err) {
                              console.error(err);
                              alert('Error fetching specs.');
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill from eBay';
                           }
                         }}
                         id="autofill-btn"
                         className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                       >
                         <span className="mr-1">✨</span> Auto-Fill from eBay
                       </button>

                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           
                           try {
                              const btn = document.getElementById('gemini-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Analyzing...';
                              
                              const res = await fetch(\`http://localhost:5000/api/ai/extract-specs\`, {
                                method: 'POST',
                                headers: { 
                                  'Authorization': \`Bearer \${localStorage.getItem('token')}\`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({ title: formData.title })
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">🤖</span> Auto-Fill with Gemini';
                              
                              if (data.success && data.itemSpecifics) {
                                 const currentSpecs = formData.platformSettings?.ebay?.itemSpecifics || {};
                                 const newSpecs = { ...currentSpecs };
                                 let addedCount = 0;
                                 
                                 for (const [k, v] of Object.entries(data.itemSpecifics)) {
                                   if (v && v.trim() !== '' && !newSpecs[k]) {
                                     newSpecs[k] = v;
                                     addedCount++;
                                   }
                                 }
                                 
                                 if (addedCount > 0) {
                                   handlePlatformChange('ebay', 'itemSpecifics', newSpecs);
                                   alert(\`Auto-filled \${addedCount} item specific(s) using Gemini AI!\`);
                                 } else {
                                   alert('No new specifics found or all fields were already filled.');
                                 }
                              } else {
                                 alert(data.message || 'Gemini could not extract specs.');
                              }
                           } catch (err) {
                              console.error(err);
                              alert('Error extracting specs with Gemini.');
                              const btn = document.getElementById('gemini-btn');
                              if (btn) btn.innerHTML = '<span class="mr-1">🤖</span> Auto-Fill with Gemini';
                           }
                         }}
                         id="gemini-btn"
                         className="flex items-center text-xs font-medium text-purple-600 bg-purple-50 px-3 py-1.5 rounded-full hover:bg-purple-100 transition-colors border border-purple-200 shadow-sm"
                       >
                         <span className="mr-1">🤖</span> Auto-Fill with Gemini
                       </button>
                       </div>`;

content = content.replace(regex, newButtons);
fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
console.log('Injected Gemini button');
