import { useRouter } from "next/router";
import AppShell from "../../components/layout/AppShell";
import PageMeta from "../../components/layout/PageMeta";
import { usePrototypeUI } from "../../context/PrototypeUIContext";
import PageHeader from "../../components/ui/PageHeader";
import PropertyCard from "../../components/ui/PropertyCard";
import { landlordNav, landlordProperties, landlordUser } from "../../data/landlord";

export default function LandlordPropertiesPage() {
  const router = useRouter();
  const { openModal } = usePrototypeUI();

  return (
    <>
      <PageMeta title="DoorRent — Properties" />
      <AppShell
        user={landlordUser}
        topbarTitle="Properties"
        breadcrumb="Dashboard → Properties"
        navSections={landlordNav}
      >
        <PageHeader
          title="Properties"
          description="4 properties · 24 units · ₦6.5M potential monthly revenue"
          actions={[
            { label: "Filter", variant: "secondary" },
            { label: "+ Add Property", modal: "add-property", variant: "primary" },
          ]}
        />

        <div className="property-grid">
          {landlordProperties.map((property) => (
            <PropertyCard
              key={property.name}
              property={property}
              onClick={() => router.push("/landlord/units")}
            />
          ))}
          <PropertyCard addNew onClick={() => openModal("add-property")} />
        </div>
      </AppShell>
    </>
  );
}
