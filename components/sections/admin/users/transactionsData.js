// app/components/sections/admin/users/transactionsData.js
// Map of userId => array of transactions. Default export is an object.

const transactionsData = {
  // Sample data you provided for user 68a702ba52364b0f4431be7e
  "68a702ba52364b0f4431be7e": [
    {
      _id: "68b562cf1857e5c583032282",
      txId: "401056847",
      user: "68a702ba52364b0f4431be7e",
      tier: "68b5473cad3203d32c79091c",
      tokensPlanned: 1000,
      amount: 10,
      currency: "EUR",
      reference: "tier-68b5473cad3203d32c79091c",
      tierTitle: "Gold",
      state: "FULFILL",
      fulfilled: true,
      createdAt: "2025-09-01T09:09:35.984+00:00",
      updatedAt: "2025-09-01T09:09:48.770+00:00",
      __v: 0,
      fulfilledAt: "2025-09-01T09:09:48.767+00:00",
    },
  ],

  // add more users’ transactions as needed
  u_004: [
    {
      _id: "t_0002",
      txId: "401056999",
      user: "u_004",
      tier: "tier_pro",
      tokensPlanned: 500,
      amount: 6,
      currency: "EUR",
      reference: "tier_pro",
      tierTitle: "Pro",
      state: "FULFILL",
      fulfilled: true,
      createdAt: "2025-08-15T10:15:00.000+00:00",
      updatedAt: "2025-08-15T10:16:00.000+00:00",
      fulfilledAt: "2025-08-15T10:16:00.000+00:00",
    },
  ],
};

export default transactionsData;
