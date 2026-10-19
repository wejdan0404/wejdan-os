/// Help & Safety (JOY-13) — static: when to seek professional help, saved
/// numbers (MOH 937 first, MOH psychological consultation line 920033360 with
/// its hours, then emergency 911, then 997 Red Crescent ambulance) with their
/// official source pages, "not a substitute
/// for a professional". Reachable from Me
/// and from Red mode. No mood tracking, no diagnosis.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../ielts/ielts_screen.dart' show openExternal;

class HelpSafetyScreen extends ConsumerWidget {
  const HelpSafetyScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    Widget number(String n, String title, String sub, {bool big = false}) => WCard(
      onTap: () => openExternal(context, 'tel:$n'),
      semanticLabel: l.callN(title, n),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: context.t.bodyStrong.copyWith(color: c.text)),
                if (sub.isNotEmpty) Text(sub, style: context.t.caption.copyWith(color: c.caption)),
              ],
            ),
          ),
          Text(n, textDirection: TextDirection.ltr, style: context.t.metric.copyWith(fontSize: big ? 24 : 20, color: c.deep)),
          const SizedBox(width: 10),
          TintIcon(Icons.call_outlined, tint: c.info, size: 40),
        ],
      ),
    );
    return HubPage(
      title: l.helpSafetyLink,
      children: [
        WCard(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Align(alignment: AlignmentDirectional.centerEnd, child: Icon(Icons.spa_outlined, size: 40, color: c.sky300)),
              Text(l.whenToSeekHelp, style: context.t.h2.copyWith(color: c.text)),
              gap12,
              for (final b in [l.helpBullet1, l.helpBullet2, l.helpBullet3])
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Padding(
                        padding: const EdgeInsets.only(top: 9),
                        child: Container(width: 5, height: 5, decoration: BoxDecoration(color: c.text, shape: BoxShape.circle)),
                      ),
                      const SizedBox(width: 10),
                      Expanded(child: Text(b, style: context.t.body.copyWith(color: c.textSecondary))),
                    ],
                  ),
                ),
            ],
          ),
        ),
        gap16,
        SectionLabel(l.savedNumbers),
        gap8,
        number('937', l.moh937, l.moh937Sub, big: true),
        gap8,
        number('920033360', l.mohPsych, l.mohPsychSub),
        gap8,
        // Full width each (Fix pass 1). Emergency: 911 first, then 997 (SRCA
        // ambulance) — both sourced below (Fix pass 3, D13).
        number('911', l.unifiedEmergency, ''),
        gap8,
        number('997', l.ambulance, ''),
        gap8,
        Text(l.erOpen, style: context.t.caption.copyWith(color: c.caption)),
        gap16,
        // Where each number comes from (official pages, JOY-13 sources).
        // 997: CST National Numbering Plan lists "997 Saudi Red Crescent"
        // (fetched 2026-09-28, BL-026).
        SectionLabel(l.helpSources),
        gap8,
        WCard(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
          child: Column(
            children: [
              for (final (label, url) in [
                (l.helpSrc937, 'https://www.moh.gov.sa/en/937/pages/default.aspx'),
                (l.helpSrcPsych, 'https://www.moh.gov.sa/en/Ministry/Information-and-services/Pages/psychiatry.aspx'),
                (l.helpSrc911, 'https://www.srca.org.sa/en'),
                (l.helpSrc997, 'https://www.cst.gov.sa/en/about/Numbering'),
              ])
                Semantics(
                  link: true,
                  label: '${l.openSource}: $label',
                  excludeSemantics: true,
                  child: InkWell(
                    onTap: () => openExternal(context, url),
                    child: ConstrainedBox(
                      constraints: const BoxConstraints(minHeight: WSpace.tap),
                      child: Row(
                        children: [
                          Expanded(child: Text(label, style: context.t.small.copyWith(color: c.accentText))),
                          Icon(Icons.open_in_new_rounded, size: 16, color: c.caption),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
        ),
        gap16,
        WCard(
          color: c.tint(TintName.lilac).bg,
          borderColor: c.tint(TintName.lilac).bg,
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.favorite_border_rounded, size: 18, color: c.tint(TintName.lilac).ink),
              const SizedBox(width: 8),
              Expanded(child: Text(l.notSubstituteLong, style: context.t.small.copyWith(color: c.tint(TintName.lilac).ink))),
            ],
          ),
        ),
      ],
    );
  }
}
