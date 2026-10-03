import { sql } from 'drizzle-orm'
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export * from './auth-schema'

const emptyTextArray = sql`'{}'::text[]`
const created = () => timestamp('created_at').defaultNow().notNull()
const updated = () =>
  timestamp('updated_at')
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()

/** Public and private details of a person. Location is stored rounded (~500 m). */
export const profile = pgTable(
  'profile',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => user.id, { onDelete: 'cascade' }),
    firstName: text('first_name').notNull(),
    birthDate: date('birth_date', { mode: 'string' }).notNull(),
    country: text('country').notNull(),
    city: text('city').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    bio: text('bio').notNull().default(''),
    experience: text('experience').notNull().default('some'),
    photoUrl: text('photo_url'),
    phone: text('phone'),
    languages: text('languages').array().notNull().default(emptyTextArray),
    wantsToWalk: boolean('wants_to_walk').notNull().default(true),
    hasDogs: boolean('has_dogs').notNull().default(false),
    quizPassedAt: timestamp('quiz_passed_at'),
    pppLicense: boolean('ppp_license').notNull().default(false),
    termsAcceptedAt: timestamp('terms_accepted_at').notNull(),
    termsVersion: text('terms_version').notNull(),
    referralCode: text('referral_code').notNull(),
    referredBy: text('referred_by'),
    /** Language for emails: the language the person last chose or signed up in. */
    locale: text('locale'),
    /** Service emails for important notifications (new request, overdue walk …). On by default. */
    emailNotifications: boolean('email_notifications').notNull().default(true),
    /** How many walks a week someone wants to do (1–7), or null without a goal. Set in onboarding. */
    weeklyGoal: integer('weekly_goal'),
    /** The highest level this person has seen celebrated, so a level-up is shown once. */
    seenLevel: integer('seen_level').notNull().default(1),
    /** Friendly reminders (weekly goal, the town's challenge, first steps). Never more than one every few days. */
    reminders: boolean('reminders').notNull().default(true),
    bannedAt: timestamp('banned_at'),
    banReason: text('ban_reason'),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    uniqueIndex('profile_referral_idx').on(t.referralCode),
    index('profile_country_idx').on(t.country),
    index('profile_referred_by_idx').on(t.referredBy),
  ],
)

/** Shelters and other organisations. Verified by an admin before their dogs go live. */
export const organization = pgTable(
  'organization',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    country: text('country').notNull(),
    city: text('city').notNull(),
    address: text('address').notNull().default(''),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    website: text('website'),
    email: text('email'),
    phone: text('phone'),
    registrationNumber: text('registration_number').notNull().default(''),
    description: text('description').notNull().default(''),
    logoUrl: text('logo_url'),
    coverUrl: text('cover_url'),
    instagram: text('instagram'),
    /** Roughly how many dogs the shelter has, from the sign-up form. */
    dogCount: integer('dog_count'),
    openingHours: text('opening_hours').notNull().default(''),
    walkingTimes: text('walking_times').notNull().default(''),
    /** Private: who Rondje contacts at the shelter. Never shown publicly. */
    coordinatorName: text('coordinator_name').notNull().default(''),
    coordinatorEmail: text('coordinator_email'),
    coordinatorPhone: text('coordinator_phone'),
    /** Defaults for the shelter's dogs: treats 'yes' | 'no' | 'own', what the shelter provides, walk length. */
    treatsPolicy: text('treats_policy').notNull().default('own'),
    provides: text('provides').array().notNull().default(emptyTextArray),
    defaultWalkMinutes: integer('default_walk_minutes').notNull().default(45),
    status: text('status').notNull().default('pending'),
    directoryId: text('directory_id'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdBy: text('created_by').references(() => user.id, { onDelete: 'set null' }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index('organization_country_idx').on(t.country, t.status)],
)

export const organizationMember = pgTable(
  'organization_member',
  {
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('staff'),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.orgId, t.userId] }), index('organization_member_user_idx').on(t.userId)],
)

/** A dog of a private owner or of an organisation. Private fields are only shown after a request is accepted. */
export const dog = pgTable(
  'dog',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').references(() => user.id, { onDelete: 'cascade' }),
    orgId: text('org_id').references(() => organization.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    breed: text('breed').notNull().default(''),
    sex: text('sex').notNull().default('female'),
    ageYears: integer('age_years'),
    size: text('size').notNull().default('medium'),
    energy: text('energy').notNull().default('medium'),
    level: text('level').notNull().default('starter'),
    ppp: boolean('ppp').notNull().default(false),
    photos: text('photos').array().notNull().default(emptyTextArray),
    /** Illustrated portrait used when there is no photo (see DogFace). */
    avatar: jsonb('avatar'),
    story: text('story').notNull().default(''),
    needs: text('needs').notNull().default(''),
    traits: text('traits').array().notNull().default(emptyTextArray),
    treats: text('treats').notNull().default('own'),
    treatsNote: text('treats_note').notNull().default(''),
    provides: text('provides').array().notNull().default(emptyTextArray),
    offLeash: boolean('off_leash').notNull().default(false),
    walkMinutes: integer('walk_minutes').notNull().default(30),
    country: text('country').notNull(),
    city: text('city').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    meetingInfo: text('meeting_info').notNull().default(''),
    vetInfo: text('vet_info').notNull().default(''),
    chipNumber: text('chip_number').notNull().default(''),
    insuranceConfirmed: boolean('insurance_confirmed').notNull().default(false),
    healthConfirmed: boolean('health_confirmed').notNull().default(false),
    biteHistory: boolean('bite_history').notNull().default(false),
    biteNote: text('bite_note').notNull().default(''),
    status: text('status').notNull().default('active'),
    isDemo: boolean('is_demo').notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index('dog_country_status_idx').on(t.country, t.status),
    index('dog_owner_idx').on(t.ownerId),
    index('dog_org_idx').on(t.orgId),
  ],
)

/** Weekly moments when a private owner's dog can be walked. weekday: 1 = Monday … 7 = Sunday. */
export const dogSlot = pgTable(
  'dog_slot',
  {
    id: text('id').primaryKey(),
    dogId: text('dog_id')
      .notNull()
      .references(() => dog.id, { onDelete: 'cascade' }),
    weekday: integer('weekday').notNull(),
    time: text('time').notNull(),
  },
  (t) => [index('dog_slot_dog_idx').on(t.dogId)],
)

/** A walker asks to meet or walk a dog. Owner (or shelter staff) accepts or declines. */
export const walkRequest = pgTable(
  'walk_request',
  {
    id: text('id').primaryKey(),
    dogId: text('dog_id')
      .notNull()
      .references(() => dog.id, { onDelete: 'cascade' }),
    walkerId: text('walker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    startsAt: timestamp('starts_at').notNull(),
    durationMin: integer('duration_min').notNull(),
    weekly: boolean('weekly').notNull().default(false),
    message: text('message').notNull().default(''),
    flags: text('flags').array().notNull().default(emptyTextArray),
    status: text('status').notNull().default('pending'),
    decidedBy: text('decided_by'),
    decidedAt: timestamp('decided_at'),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [
    index('walk_request_dog_idx').on(t.dogId, t.status),
    index('walk_request_walker_idx').on(t.walkerId, t.status),
  ],
)

/**
 * Messages between a walker and a dog's owner (or shelter staff) about one request, so
 * nobody has to hand out a phone number before they have met.
 */
export const chatMessage = pgTable(
  'chat_message',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id')
      .notNull()
      .references(() => walkRequest.id, { onDelete: 'cascade' }),
    senderId: text('sender_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    /** Money, IBAN, link, phone or email found in the text (see scanText in lib/rules.ts). */
    flags: text('flags').array().notNull().default(emptyTextArray),
    createdAt: created(),
  },
  (t) => [index('chat_message_request_idx').on(t.requestId, t.createdAt)],
)

/** Per dog and walker: the owner saw the walker's ID and/or allows solo walks. */
export const trustGrant = pgTable(
  'trust_grant',
  {
    dogId: text('dog_id')
      .notNull()
      .references(() => dog.id, { onDelete: 'cascade' }),
    walkerId: text('walker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    grantedBy: text('granted_by').notNull(),
    idSeen: boolean('id_seen').notNull().default(false),
    soloAllowed: boolean('solo_allowed').notNull().default(false),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [primaryKey({ columns: [t.dogId, t.walkerId] })],
)

/** An owner or shelter confirmed in person that they saw the walker's ID. No copies are stored. */
export const idCheck = pgTable(
  'id_check',
  {
    id: text('id').primaryKey(),
    walkerId: text('walker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    checkedBy: text('checked_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    orgId: text('org_id'),
    createdAt: created(),
  },
  (t) => [uniqueIndex('id_check_pair_idx').on(t.walkerId, t.checkedBy)],
)

export const groupWalk = pgTable(
  'group_walk',
  {
    id: text('id').primaryKey(),
    orgId: text('org_id')
      .notNull()
      .references(() => organization.id, { onDelete: 'cascade' }),
    startsAt: timestamp('starts_at').notNull(),
    durationMin: integer('duration_min').notNull().default(60),
    capacity: integer('capacity').notNull().default(4),
    level: text('level').notNull().default('starter'),
    meetingPoint: text('meeting_point').notNull().default(''),
    notes: text('notes').notNull().default(''),
    status: text('status').notNull().default('scheduled'),
    createdBy: text('created_by'),
    createdAt: created(),
  },
  (t) => [index('group_walk_org_idx').on(t.orgId, t.startsAt)],
)

export const groupWalkSignup = pgTable(
  'group_walk_signup',
  {
    groupWalkId: text('group_walk_id')
      .notNull()
      .references(() => groupWalk.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('booked'),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.groupWalkId, t.userId] }), index('group_walk_signup_user_idx').on(t.userId)],
)

/** One actual walk. Location points are only stored while it is active. */
export const walk = pgTable(
  'walk',
  {
    id: text('id').primaryKey(),
    requestId: text('request_id').references(() => walkRequest.id, { onDelete: 'set null' }),
    dogId: text('dog_id')
      .notNull()
      .references(() => dog.id, { onDelete: 'cascade' }),
    walkerId: text('walker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at').notNull(),
    plannedEndAt: timestamp('planned_end_at').notNull(),
    endedAt: timestamp('ended_at'),
    status: text('status').notNull().default('active'),
    distanceM: integer('distance_m').notNull().default(0),
    lastLat: doublePrecision('last_lat'),
    lastLng: doublePrecision('last_lng'),
    lastAt: timestamp('last_at'),
    overdueNotifiedAt: timestamp('overdue_notified_at'),
    // The little walk report owners ask for: how often the dog peed, pooped and drank.
    pee: integer('pee').notNull().default(0),
    poo: integer('poo').notNull().default(0),
    water: integer('water').notNull().default(0),
    createdAt: created(),
  },
  (t) => [
    index('walk_dog_idx').on(t.dogId, t.status),
    index('walk_walker_idx').on(t.walkerId, t.status),
    // Monthly challenges count walks by start time.
    index('walk_started_idx').on(t.startedAt),
  ],
)

export const walkPoint = pgTable(
  'walk_point',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    walkId: text('walk_id')
      .notNull()
      .references(() => walk.id, { onDelete: 'cascade' }),
    lat: doublePrecision('lat').notNull(),
    lng: doublePrecision('lng').notNull(),
    accuracy: doublePrecision('accuracy'),
    recordedAt: timestamp('recorded_at').notNull(),
  },
  (t) => [index('walk_point_walk_idx').on(t.walkId, t.id)],
)

/** A photo the walker shares during a walk, for the owner and their family. Deleted with the route after 30 days. */
export const walkPhoto = pgTable(
  'walk_photo',
  {
    id: text('id').primaryKey(),
    walkId: text('walk_id')
      .notNull()
      .references(() => walk.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    createdAt: created(),
  },
  (t) => [index('walk_photo_walk_idx').on(t.walkId, t.createdAt)],
)

/** Private feedback after a walk. Never shown to the other party; used for safety and moderation. */
export const feedback = pgTable(
  'feedback',
  {
    id: text('id').primaryKey(),
    walkId: text('walk_id')
      .notNull()
      .references(() => walk.id, { onDelete: 'cascade' }),
    fromUserId: text('from_user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: text('role').notNull(),
    answers: jsonb('answers').notNull(),
    note: text('note').notNull().default(''),
    flagged: boolean('flagged').notNull().default(false),
    createdAt: created(),
  },
  (t) => [uniqueIndex('feedback_walk_from_idx').on(t.walkId, t.fromUserId), index('feedback_from_idx').on(t.fromUserId)],
)

export const report = pgTable(
  'report',
  {
    id: text('id').primaryKey(),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    subjectUserId: text('subject_user_id').references(() => user.id, { onDelete: 'set null' }),
    dogId: text('dog_id').references(() => dog.id, { onDelete: 'set null' }),
    walkId: text('walk_id').references(() => walk.id, { onDelete: 'set null' }),
    orgId: text('org_id').references(() => organization.id, { onDelete: 'set null' }),
    category: text('category').notNull(),
    description: text('description').notNull(),
    status: text('status').notNull().default('open'),
    resolution: text('resolution'),
    resolvedBy: text('resolved_by'),
    resolvedAt: timestamp('resolved_at'),
    createdAt: created(),
  },
  (t) => [index('report_status_idx').on(t.status, t.createdAt)],
)

export const block = pgTable(
  'block',
  {
    blockerId: text('blocker_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    blockedId: text('blocked_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
)

export const notification = pgTable(
  'notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    data: jsonb('data').notNull(),
    readAt: timestamp('read_at'),
    createdAt: created(),
  },
  (t) => [index('notification_user_idx').on(t.userId, t.createdAt)],
)

/**
 * Points someone earned: one row per thing they did (a walk, the quiz, a friend who joined …).
 * Rows are only ever added, never taken away: a level stays even if a walk or dog is deleted later.
 * `ref` is the walk, group walk or person it was for ('' for one-off points); `at` is when it happened.
 */
export const pointEvent = pgTable(
  'point_event',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    ref: text('ref').notNull().default(''),
    points: integer('points').notNull(),
    at: timestamp('at').notNull(),
    /** For badges: { dogId } on walks, { dogId, walkerId } when your dog was walked. */
    meta: jsonb('meta').notNull().default({}),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind, t.ref] }), index('point_event_user_at_idx').on(t.userId, t.at)],
)

/** Badges someone earned (one row per tier), and when they saw the celebration. Only for themselves. */
export const award = pgTable(
  'award',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    tier: integer('tier').notNull(),
    earnedAt: timestamp('earned_at').defaultNow().notNull(),
    seenAt: timestamp('seen_at'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key, t.tier] })],
)

/**
 * Where to send push notifications for someone: a browser push subscription (kind 'web',
 * endpoint plus keys) or an iPhone's APNs device token (kind 'apns'). Removed when it stops working.
 */
export const pushDevice = pgTable(
  'push_device',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    endpoint: text('endpoint').notNull().unique(),
    keys: jsonb('keys'),
    sandbox: boolean('sandbox').notNull().default(false),
    createdAt: created(),
  },
  (t) => [index('push_device_user_idx').on(t.userId)],
)

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  actorId: text('actor_id'),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  data: jsonb('data'),
  createdAt: created(),
})

/**
 * Tips from users about shelters that should be on Rondje: a free-form tip, or a vote
 * ("I want to walk here") on a shelter from the directory. Rondje never contacts anyone
 * automatically; an admin follows up by hand. Tips about private people are never stored.
 */
export const suggestion = pgTable(
  'suggestion',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(), // 'shelter' (free-form tip) | 'vote' (directory entry)
    name: text('name').notNull(),
    country: text('country').notNull(),
    city: text('city').notNull(),
    website: text('website'),
    directoryId: text('directory_id'),
    note: text('note').notNull().default(''),
    suggestedBy: text('suggested_by')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('new'), // new | contacted | joined | declined | duplicate | spam
    adminNote: text('admin_note').notNull().default(''),
    handledBy: text('handled_by'),
    handledAt: timestamp('handled_at'),
    createdAt: created(),
  },
  (t) => [
    index('suggestion_status_idx').on(t.status, t.createdAt),
    index('suggestion_user_idx').on(t.suggestedBy, t.createdAt),
    // One vote per person per directory shelter. Free-form tips have no directory id (NULLs never clash).
    uniqueIndex('suggestion_vote_idx').on(t.suggestedBy, t.directoryId),
  ],
)

/**
 * The admin's launch hub (/admin/launch): one row per launch task, by the stable key from
 * src/server/launch-core.ts. Milestones that were reached are stored here too (key
 * 'milestone:<id>'), so a badge stays even if the data behind it is deleted later.
 */
export const launchTask = pgTable('launch_task', {
  key: text('key').primaryKey(),
  status: text('status').notNull().default('open'), // open | done
  doneAt: timestamp('done_at'),
  note: text('note').notNull().default(''),
})

/**
 * People and organisations the admin wants to approach for the launch (shelters, vets, student
 * associations, neighbourhood groups, local press). Business contact details only, entered by hand,
 * and only here in the database. Rondje never sends anything itself: the admin mails from their own
 * mail app and marks the status by hand (todo → sent → replied → meeting).
 */
export const outreachContact = pgTable(
  'outreach_contact',
  {
    id: text('id').primaryKey(),
    audience: text('audience').notNull(),
    name: text('name').notNull().default(''),
    organisation: text('organisation').notNull().default(''),
    email: text('email'),
    phone: text('phone'),
    city: text('city').notNull().default(''),
    status: text('status').notNull().default('todo'),
    lastContactAt: timestamp('last_contact_at'),
    note: text('note').notNull().default(''),
    createdAt: created(),
  },
  (t) => [index('outreach_contact_status_idx').on(t.status, t.createdAt)],
)

/**
 * The founder's marketing hub (/hub, admins only): ticked checklist steps, the partner pipeline,
 * the content plan, costs and settings. One row per item; `kind` says what `data` holds.
 * It never holds data about Rondje's users.
 */
export const hubEntry = pgTable(
  'hub_entry',
  {
    /** `${kind}:${key}`, for example `task:stichting` or `partner:nl-doa-amsterdam`. */
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    data: jsonb('data').notNull(),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index('hub_entry_kind_idx').on(t.kind)],
)
