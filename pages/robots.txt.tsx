import type { GetServerSideProps } from "next";
import { buildRobotsTxt } from "../lib/seo";

export const getServerSideProps: GetServerSideProps = async ({ res }) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(buildRobotsTxt());
  res.end();

  return {
    props: {},
  };
};

export default function RobotsTxtPage() {
  return null;
}
