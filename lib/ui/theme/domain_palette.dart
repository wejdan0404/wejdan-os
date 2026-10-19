/// Domain → tint family + icon (UIKIT "domain tints"). Colour is always
/// paired with an icon and a label (spec §9: no colour-only meaning).
library;

import 'package:flutter/material.dart';

import '../../data/models/models.dart';
import 'tokens.dart';

const Map<DomainId, TintName> kDomainTint = {
  DomainId.health: TintName.sage,
  DomainId.sleep: TintName.lilac,
  DomainId.food: TintName.apricot,
  DomainId.care: TintName.rose,
  DomainId.womensHealth: TintName.rose,
  DomainId.ielts: TintName.sky,
  DomainId.learning: TintName.sky,
  DomainId.career: TintName.sand,
  DomainId.driving: TintName.slate,
  DomainId.money: TintName.mint,
  DomainId.home: TintName.rose,
  DomainId.digital: TintName.slate,
  DomainId.admin: TintName.sand,
  DomainId.joy: TintName.gold,
  DomainId.people: TintName.lilac,
  DomainId.faith: TintName.sage,
  DomainId.aquarium: TintName.sky,
};

const Map<DomainId, IconData> kDomainIcon = {
  DomainId.health: Icons.directions_walk_rounded,
  DomainId.sleep: Icons.bedtime_outlined,
  DomainId.food: Icons.restaurant_rounded,
  DomainId.care: Icons.favorite_border_rounded,
  DomainId.womensHealth: Icons.spa_outlined,
  DomainId.ielts: Icons.menu_book_rounded,
  DomainId.learning: Icons.school_outlined,
  DomainId.career: Icons.work_outline_rounded,
  DomainId.driving: Icons.directions_car_outlined,
  DomainId.money: Icons.payments_outlined,
  DomainId.home: Icons.home_outlined,
  DomainId.digital: Icons.smartphone_rounded,
  DomainId.admin: Icons.assignment_outlined,
  DomainId.joy: Icons.auto_awesome_outlined,
  DomainId.people: Icons.people_outline_rounded,
  DomainId.faith: Icons.mosque_outlined,
  DomainId.aquarium: Icons.set_meal_outlined,
};

extension DomainColors on WColors {
  Tint domain(DomainId d) => tint(kDomainTint[d] ?? TintName.neutral);
}
