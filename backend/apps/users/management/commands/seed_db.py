"""
Management command: seed_db

Creates fake users, follow relationships, posts, likes and comments.
Usage:
    python manage.py seed_db
    python manage.py seed_db --reset   # Wipes existing data first
"""
from __future__ import annotations

import json
import random
from pathlib import Path

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandParser
from django.db import transaction

from faker import Faker

from apps.posts.models import Comment, Like, Post
from apps.users.models import Follow

User = get_user_model()
fake = Faker()

SEED_PASSWORD = 'password123'
ADMIN_USERNAME = 'armin_admin'
ADMIN_EMAIL = 'armin.admin@example.com'
SEED_IMAGE_DIR = Path(settings.MEDIA_ROOT) / 'posts' / 'seed'
SEED_MANIFEST = SEED_IMAGE_DIR / 'manifest.json'
SEED_AVATAR_DIR = SEED_IMAGE_DIR / 'avatars'

NUM_USERS = 10
FOLLOWS_PER_USER_MIN = 2
FOLLOWS_PER_USER_MAX = 5
POSTS_PER_USER_MIN = 3
POSTS_PER_USER_MAX = 4
COMMENTS_PER_POST_MIN = 0
COMMENTS_PER_POST_MAX = 5


class Command(BaseCommand):
    help = 'Seed the database with fake users, posts, likes and comments.'

    def _load_image_buckets(self) -> dict[int, list[dict]]:
        """Group the seed image manifest by account_index, skipping missing files."""
        if not SEED_MANIFEST.exists():
            self.stdout.write(self.style.WARNING(
                f'No seed images found at {SEED_IMAGE_DIR} - creating posts without images.'
            ))
            return {}

        buckets: dict[int, list[dict]] = {}
        for entry in json.loads(SEED_MANIFEST.read_text()):
            if not (SEED_IMAGE_DIR / entry['folder'] / entry['file']).exists():
                continue
            buckets.setdefault(entry['account_index'], []).append(entry)
        return buckets

    def _avatar_path(self, folder: str) -> str:
        """Relative media path of the topic avatar, empty if the file is missing."""
        if not (SEED_AVATAR_DIR / f'{folder}.png').exists():
            return ''
        return f'posts/seed/avatars/{folder}.png'

    def _build_caption(self, entry: dict) -> str:
        """Build a topic caption from a manifest entry."""
        # '01-containers' -> 'containers', '09-supply-chain' -> 'supplychain'
        tag = entry['folder'].split('-', 1)[1].replace('-', '')
        return f"{entry['caption_hint']} - {entry['topic']}\n#{tag} #devsecops"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            '--reset',
            action='store_true',
            help='Clear all existing users (except superusers), posts, likes and comments before seeding.',
        )

    @transaction.atomic
    def handle(self, *args, **options) -> None:
        if options['reset']:
            self.stdout.write(self.style.WARNING('Resetting data...'))
            Comment.objects.all().delete()
            Like.objects.all().delete()
            Post.objects.all().delete()
            Follow.objects.all().delete()
            User.objects.filter(is_superuser=False).delete()
            self.stdout.write(self.style.SUCCESS('Data cleared.'))

        buckets = self._load_image_buckets()
        # Each user owns one topic bucket: same topic for their avatar and posts.
        topics = [buckets[key] for key in sorted(buckets)]

        self.stdout.write('Creating admin user...')
        admin_user, created = User.objects.get_or_create(
            username=ADMIN_USERNAME,
            defaults={
                'email': ADMIN_EMAIL,
                'first_name': 'Armin',
                'last_name': 'Admin',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        if created:
            admin_user.set_password(SEED_PASSWORD)
            admin_user.save(update_fields=['password'])
        self.stdout.write(f'  Admin user: {ADMIN_USERNAME}')

        self.stdout.write('Creating users...')
        users: list[User] = []
        usernames: list[str] = []
        for i in range(NUM_USERS):
            username = fake.unique.user_name()[:30]
            email = fake.unique.email()
            bio = fake.text(max_nb_chars=150)
            avatar = self._avatar_path(topics[i % len(topics)][0]['folder']) if topics else ''
            user = User.objects.create_user(
                username=username,
                email=email,
                password=SEED_PASSWORD,
                bio=bio,
                avatar=avatar,
            )
            users.append(user)
            usernames.append(username)
            self.stdout.write(f'  Created user: {username}')

        self.stdout.write('Creating follow relationships...')
        for user in users:
            potential_targets = [u for u in users if u != user]
            num_follows = random.randint(FOLLOWS_PER_USER_MIN, FOLLOWS_PER_USER_MAX)
            targets = random.sample(potential_targets, min(num_follows, len(potential_targets)))
            for target in targets:
                Follow.objects.get_or_create(follower=user, following=target)
        self.stdout.write(f'  Total follows created: {Follow.objects.count()}')

        self.stdout.write('Creating posts...')
        posts: list[Post] = []
        for idx, user in enumerate(users):
            num_posts = random.randint(POSTS_PER_USER_MIN, POSTS_PER_USER_MAX)
            # Same topic bucket as the user's avatar, each image used at most once.
            entries = topics[idx % len(topics)] if topics else []
            if entries:
                for entry in random.sample(entries, min(num_posts, len(entries))):
                    posts.append(Post.objects.create(
                        owner=user,
                        caption=self._build_caption(entry),
                        image=f"posts/seed/{entry['folder']}/{entry['file']}",
                    ))
            else:
                for _ in range(num_posts):
                    posts.append(Post.objects.create(owner=user, caption=fake.text(max_nb_chars=200)))
        self.stdout.write(f'  Total posts created: {len(posts)}')

        self.stdout.write('Creating likes...')
        for post in posts:
            potential_likers = [u for u in users if u != post.owner]
            num_likes = random.randint(0, len(potential_likers))
            likers = random.sample(potential_likers, num_likes)
            for liker in likers:
                Like.objects.get_or_create(post=post, user=liker)
        self.stdout.write(f'  Total likes created: {Like.objects.count()}')

        self.stdout.write('Creating comments...')
        for post in posts:
            num_comments = random.randint(COMMENTS_PER_POST_MIN, COMMENTS_PER_POST_MAX)
            top_level_comments: list[Comment] = []
            for _ in range(num_comments):
                commenter = random.choice(users)
                comment = Comment.objects.create(
                    post=post,
                    user=commenter,
                    text=fake.sentence(nb_words=random.randint(5, 20)),
                )
                top_level_comments.append(comment)
            # Add a random reply to some top-level comments
            for parent in top_level_comments:
                if random.random() < 0.3:
                    replier = random.choice(users)
                    Comment.objects.create(
                        post=post,
                        user=replier,
                        text=fake.sentence(nb_words=random.randint(3, 12)),
                        parent=parent,
                    )
        self.stdout.write(f'  Total comments created: {Comment.objects.count()}')

        self.stdout.write(f'\nLogin credentials (all users share the password {SEED_PASSWORD}):\n')
        headers = ('USERNAME', 'PASSWORD')
        rows = [(ADMIN_USERNAME, SEED_PASSWORD)] + [(username, SEED_PASSWORD) for username in usernames]
        widths = [max(len(str(cell)) for cell in column) for column in zip(headers, *rows)]
        self.stdout.write('  ' + '  '.join(h.ljust(w) for h, w in zip(headers, widths)))
        self.stdout.write('  ' + '  '.join('-' * w for w in widths))
        for row in rows:
            self.stdout.write('  ' + '  '.join(cell.ljust(w) for cell, w in zip(row, widths)))

        posts_with_images = Post.objects.exclude(image='').exclude(image__isnull=True).count()
        users_with_avatars = User.objects.filter(is_superuser=False).exclude(avatar='').exclude(avatar__isnull=True).count()
        self.stdout.write(self.style.SUCCESS(
            f'\nSeeding complete! '
            f'{User.objects.filter(is_superuser=False).count()} users '
            f'({users_with_avatars} with avatars), '
            f'{Post.objects.count()} posts ({posts_with_images} with images), '
            f'{Like.objects.count()} likes, '
            f'{Comment.objects.count()} comments, '
            f'{Follow.objects.count()} follows.'
        ))
