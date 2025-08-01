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
import TemperatureHistoryChart from "@/components/dashboard/suhu-50-latest";
import RPMDashboard from "@/components/dashboard/rpm-dashboard";
import PzemHistoryChart from "@/components/dashboard/pzem-50-latest";
import RealTimeClock from "@/components/dashboard/clock";
import { CoffeeImage } from "@/components/dashboard/coffee";
import { DownloadExcel } from "@/components/dashboard/excel";

export default function DashboardPage() {
  return (
    <ContentLayout title="Dashboard Roaster Squad 2025">
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
          <div className="flex flex-col gap-4">
            {/* First Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex flex-col gap-2">
                <div className="">  
                  <RealTimeClock />
                </div>
                <div className="">
                  <CoffeeImage />
                </div>
              </div>
              <div className="">
                <PzemDashboard />
              </div>
              <div className="">
                <SuhuDashboard />
              </div>
              <div className="">
                <RPMDashboard />
              </div>
              <div className="">
                <DownloadExcel />
              </div>
            </div>

            {/* Second Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="">
                <TemperatureHistoryChart />
              </div>
              <div className="">
                <PzemHistoryChart />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </ContentLayout>
  );
}
