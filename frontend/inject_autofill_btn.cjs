const fs = require('fs');
let content = fs.readFileSync('frontend/src/components/Listings/ListingEditor.jsx', 'utf8');

const regex = /<Label className="block text-sm font-semibold text-gray-700 uppercase">Item Specifics<\/Label>\s*<\/div>\s*<\/div>/;

const replacement = `<Label className="block text-sm font-semibold text-gray-700 uppercase">Item Specifics</Label>
                       </div>
                       <button
                         type="button"
                         onClick={async () => {
                           if (!formData.title) {
                              alert('Please enter a title first to auto-fill specs.');
                              return;
                           }
                           
                           // Find the button and add a spinning class or something simple, but for now we'll just do a toast or simple fetch
                           try {
                              const btn = document.getElementById('autofill-btn');
                              if (btn) btn.innerHTML = '<span class="animate-spin inline-block mr-2">⟳</span> Fetching...';
                              
                              const res = await fetch(\`http://localhost:5000/api/ebay/catalog/search?q=\${encodeURIComponent(formData.title)}\`, {
                                headers: { 'Authorization': \`Bearer \${localStorage.getItem('token')}\` }
                              });
                              const data = await res.json();
                              
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill Specs from Web';
                              
                              if (data.success && data.itemSpecifics) {
                                 // Merge without overwriting existing
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
                              if (btn) btn.innerHTML = '<span class="mr-1">✨</span> Auto-Fill Specs from Web';
                           }
                         }}
                         id="autofill-btn"
                         className="flex items-center text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors border border-blue-200 shadow-sm"
                       >
                         <span className="mr-1">✨</span> Auto-Fill Specs from Web
                       </button>
                    </div>`;

if (regex.test(content)) {
   content = content.replace(regex, replacement);
   fs.writeFileSync('frontend/src/components/Listings/ListingEditor.jsx', content);
   console.log('Successfully injected Auto-Fill button.');
} else {
   console.log('Failed to match regex for Auto-Fill button.');
}
