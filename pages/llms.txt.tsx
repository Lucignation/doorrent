import type { GetServerSideProps } from "next";
import { buildLlmsTxt } from "../lib/seo";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(buildLlmsTxt());
  res.end();

  return {
    props: {},
  };
};

export default function LlmsTxtPage() {
  return null;
}
