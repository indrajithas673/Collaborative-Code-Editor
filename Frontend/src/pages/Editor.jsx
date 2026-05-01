import { Editor as MonacoEditor } from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import { useRef, useMemo, useState, useEffect, useContext } from 'react';
import * as Y from 'yjs';
import { SocketIOProvider } from 'y-socket.io';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';
import { 
  Users, History, ChevronLeft, Share2, Moon, Sun, 
  Cloud, CloudCog, UserPlus, X, Trash2, FileText, Code2, Edit2
} from 'lucide-react';
import { cn } from '../lib/utils';

const Editor = () => {
  const { documentId } = useParams();
  const { user, token } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const editorRef = useRef(null);
  const providerRef = useRef(null);
  
  const [docMeta, setDocMeta] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Rename State
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Share Modal State
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('Viewer');
  const [isSharing, setIsSharing] = useState(false);
  
  const ydoc = useMemo(() => new Y.Doc(), []);
  const yText = useMemo(() => ydoc.getText('monaco'), [ydoc]);

  const fetchDoc = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/documents/${documentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocMeta(res.data);
      setLoading(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load document');
      navigate('/dashboard');
    }
  };

  useEffect(() => {
    fetchDoc();
  }, [documentId, token]);

  useEffect(() => {
    if (!token || loading || !docMeta) return;

    const provider = new SocketIOProvider(import.meta.env.VITE_SOCKET_URL, documentId, ydoc, {
      autoConnect: true,
      auth: { token }
    });

    providerRef.current = provider;

    // Simulate saving indicator
    ydoc.on('update', () => {
      setIsSaving(true);
      const timeout = setTimeout(() => setIsSaving(false), 3000);
      return () => clearTimeout(timeout);
    });

    provider.awareness.setLocalStateField('user', { 
      username: user.username,
      color: '#' + Math.floor(Math.random()*16777215).toString(16)
    });

    const updateActiveUsers = () => {
      const states = Array.from(provider.awareness.getStates().values());
      setActiveUsers(states.filter(state => state.user && state.user.username).map(state => state.user));
    };

    updateActiveUsers();
    provider.awareness.on('change', updateActiveUsers);

    return () => {
      provider.disconnect();
    };
  }, [documentId, token, user, loading, docMeta, ydoc]);

  const handleMount = (editor) => {
    editorRef.current = editor;

    if (docMeta && docMeta.userRole === 'Viewer') {
      editor.updateOptions({ readOnly: true });
    }

    new MonacoBinding(
      yText,
      editorRef.current.getModel(),
      new Set([editorRef.current]),
      providerRef.current?.awareness
    );
  };

  const handleShare = async (e) => {
    e.preventDefault();
    if (!shareEmail) return;
    setIsSharing(true);
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share`, 
        { email: shareEmail, role: shareRole },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Document shared successfully');
      setShareEmail('');
      fetchDoc(); // Refresh to get updated collaborators
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error sharing document');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRemoveCollaborator = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this collaborator?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/documents/${documentId}/share/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Collaborator removed successfully');
      fetchDoc(); // Refresh to get updated collaborators
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error removing collaborator');
    }
  };

  const handleRename = async (e) => {
    e.preventDefault();
    if (!renameTitle.trim()) {
      toast.error('Document name cannot be empty');
      return;
    }
    setIsRenaming(true);
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/documents/${documentId}`, 
        { title: renameTitle.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Document renamed');
      setIsRenameModalOpen(false);
      fetchDoc();
    } catch (err) {
      toast.error('Error renaming document');
    } finally {
      setIsRenaming(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-gray-50 dark:bg-gray-950 flex flex-col">
        <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse" />
        <div className="flex-1 flex">
          <div className="w-16 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 animate-pulse hidden md:block" />
          <div className="flex-1 bg-gray-50 dark:bg-gray-950 animate-pulse" />
        </div>
      </div>
    );
  }

  const isOwner = docMeta?.userRole === 'Owner';

  return (
    <div className="h-screen w-full bg-gray-50 dark:bg-gray-950 flex flex-col font-sans overflow-hidden text-gray-900 dark:text-gray-100 transition-colors duration-200">
      
      {/* Top Navbar */}
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 shrink-0 transition-colors duration-200 z-10">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors" title="Back to Dashboard">
            <ChevronLeft size={18} />
          </Link>
          <div className="flex items-center gap-3 border-l border-gray-200 dark:border-gray-800 pl-4">
            <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
              if (docMeta.userRole === 'Owner' || docMeta.userRole === 'Editor') {
                setRenameTitle(docMeta.title);
                setIsRenameModalOpen(true);
              }
            }}>
              <h1 className="font-medium text-sm truncate max-w-[200px] sm:max-w-xs">{docMeta.title}</h1>
              {(docMeta.userRole === 'Owner' || docMeta.userRole === 'Editor') && (
                <Edit2 size={12} className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400">
              {isSaving ? <CloudCog size={12} className="animate-pulse" /> : <Cloud size={12} />}
              <span>{isSaving ? 'Saving...' : 'Saved'}</span>
            </div>
            {docMeta.userRole === 'Viewer' && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-500">Read Only</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Active Users Avatars */}
          <div className="flex -space-x-2 mr-2">
            {activeUsers.slice(0, 4).map((u, i) => (
              <div 
                key={i} 
                className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white dark:border-gray-900 shadow-sm z-10 hover:z-20 transition-transform hover:scale-110 cursor-default"
                style={{ backgroundColor: u.color || '#f59e0b', color: '#fff' }}
                title={u.username}
              >
                {u.username.charAt(0).toUpperCase()}
              </div>
            ))}
            {activeUsers.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-[10px] font-medium border-2 border-white dark:border-gray-900 text-gray-600 dark:text-gray-300 z-0">
                +{activeUsers.length - 4}
              </div>
            )}
          </div>

          <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 mx-1"></div>

          {isOwner && (
            <button 
              onClick={() => setIsShareModalOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-lg transition-colors"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          <button 
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={cn("p-1.5 rounded-lg transition-colors", isHistoryOpen ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white" : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white")}
            title="Version History"
          >
            <History size={18} />
          </button>

          <button 
            onClick={toggleTheme}
            className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* Very slim left icon sidebar for IDE feel */}
        <aside className="w-14 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col items-center py-4 gap-4 hidden md:flex shrink-0">
          <button className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Explorer">
            <FileText size={20} />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors" title="Source Control">
            <Code2 size={20} />
          </button>
        </aside>

        {/* Editor Wrapper */}
        <div className={cn("flex-1 transition-all duration-300 relative", isHistoryOpen ? "mr-80" : "mr-0")}>
          <MonacoEditor
            height="100%"
            defaultLanguage="javascript"
            theme={theme === 'dark' ? 'vs-dark' : 'light'}
            onMount={handleMount}
            options={{
              minimap: { enabled: false },
              padding: { top: 24, bottom: 24 },
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              renderLineHighlight: "all"
            }}
            loading={<div className="h-full flex items-center justify-center text-gray-400">Loading editor...</div>}
          />
        </div>

        {/* Slide-over Version History Panel */}
        <div className={cn(
          "absolute top-0 right-0 w-80 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 shadow-2xl dark:shadow-none flex flex-col transition-transform duration-300 z-20",
          isHistoryOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="h-14 px-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between shrink-0">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <History size={16} className="text-gray-500" />
              Version History
            </h2>
            <button onClick={() => setIsHistoryOpen(false)} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {docMeta.versions?.length > 0 ? (
              <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-gray-200 dark:before:via-gray-800 before:to-transparent">
                {docMeta.versions.map((v, i) => (
                  <div key={v._id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Simplified Timeline logic for right-panel list */}
                    <div className="flex flex-col w-full pl-8 py-2 relative">
                      <div className="absolute left-2 top-4 w-2 h-2 rounded-full bg-blue-500 border-2 border-white dark:border-gray-900 shadow"></div>
                      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-100 dark:border-gray-800 hover:border-blue-500/50 transition-colors cursor-pointer group">
                        <div className="font-medium text-sm text-gray-900 dark:text-white">
                          Saved by {v.createdBy?.username || 'Unknown'}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(v.createdAt).toLocaleString()}
                        </div>
                        {isOwner && (
                          <button className="mt-2 text-xs font-medium text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity">
                            Restore this version
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center mt-10">
                <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <History size={20} className="text-gray-400" />
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">No versions yet</p>
                <p className="text-xs text-gray-500 mt-1">Autosave will snapshot your changes periodically.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Share2 size={18} className="text-blue-500" />
                Share Document
              </h2>
              <button onClick={() => setIsShareModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              <form onSubmit={handleShare} className="flex gap-2 mb-6">
                <input 
                  type="email" 
                  placeholder="Enter email address..."
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  disabled={isSharing}
                />
                <select 
                  value={shareRole} 
                  onChange={(e) => setShareRole(e.target.value)}
                  className="w-28 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isSharing}
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Editor">Editor</option>
                </select>
                <button 
                  type="submit" 
                  disabled={isSharing || !shareEmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  Invite
                </button>
              </form>

              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">People with access</h3>
                
                {/* Owner */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
                      {docMeta.owner.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{docMeta.owner.username} <span className="text-gray-400 font-normal">(You)</span></p>
                      <p className="text-xs text-gray-500">{docMeta.owner.email}</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">Owner</span>
                </div>

                {/* Collaborators */}
                {docMeta.collaborators?.map((c) => (
                  <div key={c.user._id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-xs">
                        {c.user.username[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{c.user.username}</p>
                        <p className="text-xs text-gray-500">{c.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">{c.role}</span>
                      {isOwner && (
                        <button 
                          onClick={() => handleRemoveCollaborator(c.user._id)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                          title="Remove access"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold">Rename Document</h2>
              <button onClick={() => setIsRenameModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleRename} className="p-6">
              <input 
                type="text" 
                autoFocus
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all mb-4"
                placeholder="Document title..."
              />
              <div className="flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setIsRenameModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isRenaming || !renameTitle.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {isRenaming ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Editor;
