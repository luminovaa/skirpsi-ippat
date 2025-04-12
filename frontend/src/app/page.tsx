"use client";
import Link from "next/link";
import { ContentLayout } from "@/components/admin-panel/content-layout";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import PzemDashboard from "@/components/dashboard/pzem-dashboard";
import SuhuDashboard from "@/components/dashboard/suhu-dashboard";

export default function DashboardPage() {
  return (
    <ContentLayout title="Dashboard">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <Card className="rounded-lg border-none mt-6">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row min-h-[calc(100vh-56px-64px-20px-24px-56px-48px)] gap-4">
            <div className="sm:w1/2">
              <PzemDashboard />
            </div>
            <div className="sm:w1/2">
              <SuhuDashboard />
            </div>
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
