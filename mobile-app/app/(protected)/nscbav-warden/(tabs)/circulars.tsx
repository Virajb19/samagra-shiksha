import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
  return (
    <CircularsScreen
      role="NSCBAV_WARDEN"
      queryKey={['circulars', 'nscbav-warden']}
      canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
    />
  );
}
