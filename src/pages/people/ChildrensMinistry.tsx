import { Baby } from "lucide-react";
import { Helmet } from "react-helmet-async";

export default function ChildrensMinistry() {
  return (
    <>
      <Helmet><title>Children's Ministry — Vestry</title></Helmet>
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
          <Baby className="h-8 w-8 text-orange-500" />
        </div>
        <div>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">Children's Ministry</p>
          <p className="text-sm text-slate-500 mt-1 max-w-sm">
            Manage children's classes, attendance, and ministry programs. Coming soon.
          </p>
        </div>
      </div>
    </>
  );
}
