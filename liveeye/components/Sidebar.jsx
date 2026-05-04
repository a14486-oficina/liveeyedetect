const Sidebar = () => {
  return (
    <div className="w-56 h-screen bg-gray-900 text-white fixed left-0 top-0 border-r border-gray-800 flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <h1 className="text-sm font-medium">Backoffice</h1>
      </div>

      <nav className="flex flex-col p-4 gap-2">
        <button className="text-left p-2 rounded hover:bg-gray-800">
          Dashboard
        </button>
        <button className="text-left p-2 rounded hover:bg-gray-800">
          Pessoas
        </button>
      </nav>
    </div>
  );
};

export default Sidebar;