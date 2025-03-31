import React from 'react';
import { Slot } from 'expo-router';
import { AdminSidebar } from '../../components/AdminSidebar';

export default function AdminLayout() {
  return (
    <AdminSidebar>
      <Slot />
    </AdminSidebar>
  );
} 