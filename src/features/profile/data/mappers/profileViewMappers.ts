import type { ActivityPage, ProfileActivity, PublicProfile } from '../../domain/entities/PublicProfile';
import type { ActivityCardDto, ActivityPageDto, PublicProfileDto } from '../dto/profileViewDtos';
import { toInterest, toPlaceRef, toPlaceRefs, toTravelStyles } from './profileMappers';

export function toPublicProfile(dto: PublicProfileDto): PublicProfile {
  return {
    id: dto.id,
    handle: dto.handle ?? null,
    displayName: dto.displayName,
    avatarUrl: dto.avatarUrl ?? null,
    gender: dto.gender ?? null,
    homePlace: dto.homePlace ? toPlaceRef(dto.homePlace) : null,
    interests: (dto.interests ?? []).map(toInterest),
    about: {
      bio: dto.bio ?? null,
      pronouns: typeof dto.extras?.pronouns === 'string' ? dto.extras.pronouns : null,
      tagline: typeof dto.extras?.tagline === 'string' ? dto.extras.tagline : null,
      photos: [...(dto.photos ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({ id: p.id, url: p.url, thumbUrl: p.thumbUrl })),
      verified: dto.verified ?? false,
    },
    travelStyles: toTravelStyles(dto.extras),
    favouriteDestinations: toPlaceRefs(dto.favouriteDestinations),
    openToMeetToday: dto.openToMeetToday ?? false,
    sharePlans: dto.sharePlans ?? false,
    memberSince: dto.memberSince,
    blockedByMe: dto.blockedByMe ?? false,
  };
}

export function toActivity(dto: ActivityCardDto): ProfileActivity {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    imageUrl: dto.images?.[0]?.cardUrl ?? null,
    startAt: dto.startAt ?? null,
    placeName: dto.placeName ?? null,
    locality: dto.localityLabel?.trim()
      ? { label: dto.localityLabel.trim(), countryCode: dto.countryCode ?? null }
      : null,
    goingCount: dto.goingCount ?? 0,
    capacity: dto.capacity ?? null,
    interests: (dto.interests ?? []).map(toInterest),
    photoCount: dto.images?.length ?? 0,
    host: {
      id: dto.host?.id ?? '',
      name: dto.host?.displayName ?? '',
      avatarUrl: dto.host?.avatarUrl ?? null,
    },
    distanceKm: dto.distanceKm ?? null,
    saved: dto.saved ?? false,
  };
}

export const toActivityPage = (dto: ActivityPageDto): ActivityPage => ({
  items: (dto.items ?? []).map(toActivity),
  nextCursor: dto.nextCursor ?? null,
});
