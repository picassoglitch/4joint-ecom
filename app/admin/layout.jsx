import AdminLayout from "@/components/admin/AdminLayout";

export const metadata = {
    title: "4joint - Administrador",
    description: "4joint - Panel de Administración",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <AdminLayout>
                {children}
            </AdminLayout>
        </>
    );
}
