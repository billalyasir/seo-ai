"use client";
import InfoCards from "@/components/sections/admin/InfoCards";
import TokenDeduxManagement from "@/components/sections/admin/pricing/TokenDeduxManagement";
import { useDispatch } from "react-redux";
import React, { useEffect, useState } from "react";
import { fetchFeedbackCount } from "@/lib/redux/slices/feedbackCountSlice";
import { fetchPricingCount } from "@/lib/redux/slices/pricingCountSlice";
import { fetchUserCount } from "@/lib/redux/slices/userCountSlice";

const Admin = () => {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(fetchFeedbackCount());
    dispatch(fetchPricingCount());
    dispatch(fetchUserCount());
  }, [dispatch]);
  return (
    <div>
      <h1 className="text-xl mb-3 font-bold">Admin Manage!</h1>
      <div>
        <InfoCards />
      </div>
      <TokenDeduxManagement />
    </div>
  );
};

export default Admin;
