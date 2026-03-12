import React from 'react';
import CircularsScreen from '../../../../src/components/CircularsScreen';

export default function CircularsTabScreen() {
  return (
    <CircularsScreen
      role="HEADMASTER"
      queryKey={['circulars', 'headmaster']}
      canAccessOverride={({ hasCompletedProfile, isActive }) => hasCompletedProfile && isActive}
    />
  );
}
