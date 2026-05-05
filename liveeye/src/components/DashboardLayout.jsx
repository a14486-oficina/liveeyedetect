import Sidebar from "./Sidebar";
 
const DashboardLayout = ({ children }) => {
  return (
    <div className="flex bg-gray-950 text-gray-100 min-h-screen">
      <Sidebar />
 
      <main className="ml-56 p-6 w-full">
        {children}
      </main>
    </div>
  );
};
 
export default DashboardLayout;