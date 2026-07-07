const fs = require('fs');
let code = fs.readFileSync('../frontend/src/components/Messages/EbayMessages.jsx', 'utf8');

// Add states
code = code.replace(
  /const \[error, setError\] = useState\(null\);/,
  `const [error, setError] = useState(null);\n  const [page, setPage] = useState(1);\n  const [loadingMore, setLoadingMore] = useState(false);\n  const [hasMore, setHasMore] = useState(true);`
);

// Update fetchMessages
const fetchLogic = `
  const fetchMessages = async (pageNum = 1, append = false) => {
    try {
      if (append) setLoadingMore(true);
      else setLoading(true);
      
      const res = await api.get(\`/ebay/messages?page=\${pageNum}\`);
      if (res.data.success) {
        if (append) {
          setConversations(prev => {
            const newConvos = [...prev];
            res.data.data.forEach(incoming => {
              const existingIdx = newConvos.findIndex(c => c.id === incoming.id || (c.sender === incoming.sender && c.itemId === incoming.itemId));
              if (existingIdx >= 0) {
                // Merge replies
                const existing = newConvos[existingIdx];
                const mergedReplies = [...(existing.replies || [])];
                (incoming.replies || []).forEach(r => {
                  if (!mergedReplies.find(mr => mr.date === r.date && mr.body === r.body)) {
                    mergedReplies.push(r);
                  }
                });
                mergedReplies.sort((a, b) => new Date(a.date) - new Date(b.date));
                newConvos[existingIdx] = { ...existing, ...incoming, replies: mergedReplies };
              } else {
                newConvos.push(incoming);
              }
            });
            // Sort all by date descending (newest first)
            return newConvos.sort((a, b) => {
              const aLatest = a.replies?.length ? new Date(a.replies[a.replies.length - 1].date) : new Date(a.date);
              const bLatest = b.replies?.length ? new Date(b.replies[b.replies.length - 1].date) : new Date(b.date);
              return bLatest - aLatest;
            });
          });
        } else {
          setConversations(res.data.data);
        }
        setHasMore(res.data.hasMore !== false);
      } else {
        setError(res.data.message || 'Failed to load messages');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };
`;

code = code.replace(/const fetchMessages = async \(\) => \{[\s\S]*?setLoading\(false\);\n    \}\n  \};/, fetchLogic.trim());

// Update useEffect to use page=1
code = code.replace(
  /fetchMessages\(\);\n    const interval = setInterval\(fetchMessages, 60000\); \/\/ Check for new messages every 60s\n    return \(\) => clearInterval\(interval\);/g,
  `fetchMessages(1, false);\n    const interval = setInterval(() => fetchMessages(1, false), 60000);\n    return () => clearInterval(interval);`
);

// Add scroll listener
const scrollLogic = `
  const handleScroll = (e) => {
    const { scrollTop, clientHeight, scrollHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50 && !loadingMore && hasMore) {
      setPage(prev => {
        const next = prev + 1;
        fetchMessages(next, true);
        return next;
      });
    }
  };
`;

code = code.replace(/const scrollToBottom = \(\) => \{/, scrollLogic + '\n  const scrollToBottom = () => {');

// Add onScroll to the messages list div
code = code.replace(
  /<div style=\{\{\n              flex: 1,\n              overflowY: 'auto',\n              background: 'white'/g,
  `<div \n              onScroll={handleScroll}\n              style={{\n              flex: 1,\n              overflowY: 'auto',\n              background: 'white'`
);

// Add loading spinner at the bottom
code = code.replace(
  /\{filteredConversations\.length === 0 \? \(\n                  <div style=\{\{ padding: '24px', textAlign: 'center', color: '#64748b' \}\}>\n                    No messages found\.\n                  <\/div>\n                \) : \(\n                  filteredConversations\.map\(chat =>/g,
  `{filteredConversations.length === 0 && !loading ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                    No messages found.
                  </div>
                ) : (
                  <>
                    {filteredConversations.map(chat =>`
);

code = code.replace(
  /                  \)\)\n                \)}/g,
  `                  ))}
                    {loadingMore && (
                      <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                        Loading older messages...
                      </div>
                    )}
                  </>
                )}`
);

fs.writeFileSync('../frontend/src/components/Messages/EbayMessages.jsx', code);
console.log('Patched frontend');
