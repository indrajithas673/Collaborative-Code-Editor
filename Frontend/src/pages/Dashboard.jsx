import { useState, useEffect, useContext, useMemo } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  FileText, Plus, Search, MoreVertical, LogOut, 
  Trash2, Edit2, Users, Code2, Moon, Sun, 
  Settings, Clock
} from 'lucide-react';

const Dashboard = () => {
  const { user, token, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Rename State
  const [renameDocId, setRenameDocId] = useState(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDocuments(res.data);
    } catch (err) {
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async () => {
    setIsCreating(true);
    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/documents`,
        { title: 'Untitled Document' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Document created!');
      navigate(`/editor/${res.data._id}`);
    } catch (err) {
      toast.error('Error creating document');
    } finally {
      setIsCreating(false);
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
      await axios.put(`${import.meta.env.VITE_API_URL}/documents/${renameDocId}`, 
        { title: renameTitle.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Document renamed');
      setRenameDocId(null);
      fetchDocuments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error renaming document');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Document deleted');
      setDocuments(documents.filter(doc => doc._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error deleting document');
    }
  };

  const filteredDocs = useMemo(() => {
    if (!searchQuery) return documents;
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [documents, searchQuery]);

  // Skeleton Loader Component
  const SkeletonCard = () => (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 h-40 flex flex-col justify-between animate-pulse">
      <div>
        <div className="h-5 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-3"></div>
        <div className="h-4 bg-gray-100 dark:bg-gray-800/50 rounded w-1/2"></div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="h-6 w-16 bg-gray-100 dark:bg-gray-800 rounded-full"></div>
        <div className="h-6 w-6 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors duration-200 font-sans">
      
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col transition-colors duration-200 hidden md:flex shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <Code2 className="w-6 h-6 text-blue-600 dark:text-blue-500 mr-2" />
          <span className="font-bold tracking-tight text-lg">CollabEditor</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2">Workspace</div>
          <button className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
            <FileText className="w-4 h-4 mr-3" />
            All Documents
          </button>
          <button className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Clock className="w-4 h-4 mr-3" />
            Recent
          </button>
          <button className="w-full flex items-center px-2 py-2 text-sm font-medium rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <Users className="w-4 h-4 mr-3" />
            Shared with me
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center space-x-2 truncate">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-sm font-medium truncate">{user?.username}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button 
              onClick={toggleTheme}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors flex-1 flex justify-center"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={() => {
                logout();
                toast.success('Logged out');
                navigate('/login');
              }}
              className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-1 flex justify-center"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 px-8 flex items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shrink-0">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent rounded-lg focus:bg-white dark:focus:bg-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all text-sm"
              />
            </div>
          </div>
          <div className="ml-4 flex items-center">
            <button 
              onClick={handleCreateDocument}
              disabled={isCreating}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-sm shadow-blue-500/20 transition-all disabled:opacity-70"
            >
              <Plus className="w-4 h-4 mr-2" />
              {isCreating ? 'Creating...' : 'New Document'}
            </button>
          </div>
        </header>

        {/* Workspace */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1">Your Documents</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Create, edit, and manage your collaborative files.</p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => <SkeletonCard key={i} />)}
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No documents found</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mb-6">
                {searchQuery ? 'Try adjusting your search query.' : 'Get started by creating a new document and inviting your team.'}
              </p>
              {!searchQuery && (
                <button 
                  onClick={handleCreateDocument}
                  className="text-blue-600 dark:text-blue-400 font-medium hover:underline text-sm"
                >
                  Create your first document
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredDocs.map((doc) => {
                const isOwner = doc.owner._id === user.id;
                
                return (
                  <div 
                    key={doc._id} 
                    onClick={() => navigate(`/editor/${doc._id}`)}
                    className="group bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 h-40 flex flex-col justify-between hover:shadow-lg hover:shadow-gray-200/50 dark:hover:shadow-none dark:hover:border-gray-700 cursor-pointer transition-all duration-200 hover:-translate-y-0.5 relative"
                  >
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate pr-6">
                          {doc.title}
                        </h3>
                        {/* Dropdown Menu Toggle (Static visual for now, functional delete) */}
                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-white dark:bg-gray-900 shadow-sm rounded-md border border-gray-100 dark:border-gray-800 p-0.5">
                          {(isOwner || doc.collaborators?.some(c => c.user === user.id && c.role === 'Editor')) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenameDocId(doc._id);
                                setRenameTitle(doc.title);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title="Rename Document"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {isOwner && (
                            <button 
                              onClick={(e) => handleDelete(doc._id, e)}
                              className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Delete Document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Modified {new Date(doc.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        isOwner 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                          : 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {isOwner ? 'Owner' : 'Shared'}
                      </span>
                      
                      <div className="flex -space-x-2">
                        {/* Owner Avatar */}
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-[10px] font-bold" title={`Owner: ${doc.owner.username}`}>
                          {doc.owner.username[0].toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Rename Modal */}
      {renameDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <h2 className="text-lg font-semibold">Rename Document</h2>
              <button onClick={() => setRenameDocId(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Trash2 className="hidden" /> {/* just to import safely */}
                <span className="text-xl leading-none">&times;</span>
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
                  onClick={() => setRenameDocId(null)}
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

export default Dashboard;
