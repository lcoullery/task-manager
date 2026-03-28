/**
 * Avatar component
 * Displays a colored circle with user/profile initials
 * Replaces the ProfileAvatar from the deleted Profiles component
 */

import { getInitials } from '../../utils/colors';

export function Avatar({ profile, size = 'sm' }) {
  if (!profile) return null;

  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base'
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: profile.color || '#3B82F6' }}
      title={profile.name}
    >
      {getInitials(profile.name)}
    </div>
  );
}

// Backward compatibility alias
export const ProfileAvatar = Avatar;
