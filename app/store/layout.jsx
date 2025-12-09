import StoreLayout from "@/components/store/StoreLayout";

export const metadata = {
    title: "4joint - Panel de Tienda",
    description: "4joint - Panel de Tienda",
};

export default function RootAdminLayout({ children }) {

    return (
        <>
            <StoreLayout>
                {children}
            </StoreLayout>
        </>
    );
}
