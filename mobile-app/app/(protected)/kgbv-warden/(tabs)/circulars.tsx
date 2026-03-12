import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
  return (
    <CircularsScreen
      role="KGBV_WARDEN"
      queryKey={['circulars', 'kgbv-warden']}
      canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
    />
  );
}
