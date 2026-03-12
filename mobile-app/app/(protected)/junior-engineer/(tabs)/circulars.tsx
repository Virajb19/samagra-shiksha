import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
  return (
    <CircularsScreen
      role="JUNIOR_ENGINEER"
      queryKey={['circulars', 'junior-engineer']}
      canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
    />
  );
}
