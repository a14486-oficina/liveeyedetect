import DashboardLayout from "../components/DashboardLayout";

const Dashboard = () => {
  return (
    <DashboardLayout>
      <h1 className="text-2xl font-semibold mb-4">
        Pessoas Desaparecidas
      </h1>

      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        Conteúdo aqui
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;