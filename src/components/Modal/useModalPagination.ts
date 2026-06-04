import { useSearchParams } from "react-router-dom";

export function useModalPagination(total: number, pageSize = 25) {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const totalPages = Math.ceil(total / pageSize);

  const goTo = (p: number) => {
    if (p < 1 || p > totalPages || p === page) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("page", String(p));
      return next;
    }, { replace: true });
  };

  return { page, totalPages, goTo, searchParams, setSearchParams };
}