"use client";

import { UserButton as ClerkUserButton } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export const UserButton = () => {
  const { theme } = useTheme();

  return (
    <ClerkUserButton
      appearance={{
        baseTheme: theme === "dark" ? dark : undefined,
        elements: {
          avatarBox: "h-[35px] w-[35px]",
        },
      }}
      userProfileMode="navigation"
      userProfileUrl="/account"
    />
  );
};
