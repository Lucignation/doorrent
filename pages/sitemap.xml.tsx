import type { GetServerSideProps } from "next";
import { buildSitemapXml } from "../lib/seo";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.write(buildSitemapXml());
  res.end();

  return {
    props: {},
  };
};

export default function SitemapXmlPage() {
  return null;
}
