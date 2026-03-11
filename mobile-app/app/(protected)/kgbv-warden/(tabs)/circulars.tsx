import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
  return (
    <CircularsScreen
      role="kgbv-warden"
      queryKey={['circulars', 'kgbv-warden']}
      roleFilter={(item, role) => {
        const targets = item?.target_roles ?? item?.roles;
        if (!Array.isArray(targets) || targets.length === 0) return true;
        return targets.includes('all') || targets.includes(role);
      }}
      canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
    />
  );
}
