import React from 'react';
import AuthCard from './AuthCard';
import { Button } from '@/components/ui/button';

export default {
  title: 'Components/AuthCard',
  component: AuthCard,
};

export const Default = () => (
  <AuthCard
    title="Sign In"
    description="Please enter your credentials to sign in."
  >
    <form className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full px-4 py-2 border rounded"
      />
      <Button className="w-full">Sign In</Button>
    </form>
  </AuthCard>
);

export const WithBackButton = () => (
  <AuthCard
    showBackButton
    title="Sign Up"
    description="Create a new account."
  >
    <form className="space-y-4">
      <input
        type="text"
        placeholder="Name"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="email"
        placeholder="Email"
        className="w-full px-4 py-2 border rounded"
      />
      <input
        type="password"
        placeholder="Password"
        className="w-full px-4 py-2 border rounded"
      />
      <Button className="w-full">Sign Up</Button>
    </form>
  </AuthCard>
);

export const WithResponseMessage = () => (
  <AuthCard
    title="Reset Password"
    description="Enter your email to reset your password."
    responseMessage="An error occurred. Please try again."
  >
    <form className="space-y-4">
      <input
        type="email"
        placeholder="Email"
        className="w-full px-4 py-2 border rounded"
      />
      <Button className="w-full">Reset Password</Button>
    </form>
  </AuthCard>
);