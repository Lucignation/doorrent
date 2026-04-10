import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const params = new URLSearchParams();

  Object.entries(context.query).forEach(([key, value]) => {
    if (typeof value === "string") {
      params.set(key, value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    }
  });

  const destination = params.toString() ? `/portal?${params.toString()}` : "/portal";

  return {
    redirect: {
      destination,
      permanent: false,
    },
  };
};

export default function EstateLoginAliasPage() {
  return null;
}
