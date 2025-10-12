"use client";
import ProductsPage from "@/components/products/ProductsPage";
import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
const UploadFile = () => {
  const router = useRouter();
  const { profile, loading } = useSelector((state) => state?.profile);
  useEffect(() => {
    if (!localStorage.getItem("token") && !profile && !loading)
      return router.push("/signup");
  }, [profile, loading]);
  return (
    <div>
      <ProductsPage />
    </div>
  );
};

export default UploadFile;
