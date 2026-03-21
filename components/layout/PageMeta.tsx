import Head from "next/head";

interface PageMetaProps {
  title: string;
  description?: string;
}

export default function PageMeta({ title, description }: PageMetaProps) {
  return (
    <Head>
      <title>{title}</title>
      {description ? <meta name="description" content={description} /> : null}
    </Head>
  );
}
