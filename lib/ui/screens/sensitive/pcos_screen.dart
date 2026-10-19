/// PCOS reference (sensitive module, off by default). Content comes only
/// from action FOOD-19 and is framed "إذا كان لديك تشخيص" — no symptom
/// checks, no diagnosis language, no tracking.
library;

import 'package:flutter/material.dart' hide Action;
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../data/models/models.dart';
import '../../../state/providers.dart';
import '../../format.dart';
import '../../theme/theme_ext.dart';
import '../../widgets/widgets.dart';
import '../ielts/ielts_screen.dart' show openExternal;
import 'sensitive_gate.dart';

const kPcosActionId = 'FOOD-19';

class PcosScreen extends ConsumerWidget {
  const PcosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final l = context.l;
    final c = context.c;
    final lang = context.lang;
    final s = ref.watch(settingsProvider);
    final a = ref.watch(snapshotProvider)?.action(kPcosActionId);
    if (!s.pcosModule || a == null) {
      return HubPage(title: l.pcosTitle, children: [EmptyRestState(message: l.moduleOff)]);
    }
    Widget field(String label, ActionField f) {
      final t = a.text(f, lang);
      if (t == null) return const SizedBox.shrink();
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(label, style: context.t.label.copyWith(color: c.caption)),
            const SizedBox(height: 4),
            Text(t, textDirection: textDirFor(t, context), style: context.t.small.copyWith(color: c.text)),
          ],
        ),
      );
    }

    return SensitiveGate(
      title: l.pcosTitle,
      child: HubPage(
        title: l.pcosTitle,
        subtitle: l.ifDiagnosed,
        children: [
          WCard(
            color: c.tint(TintName.lilac).bg,
            borderColor: c.tint(TintName.lilac).bg,
            child: Text(l.pcosBanner, style: context.t.small.copyWith(color: c.tint(TintName.lilac).ink, fontWeight: FontWeight.w600)),
          ),
          gap16,
          WCard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(a.title(lang), style: context.t.h2.copyWith(color: c.text)),
                gap12,
                field(l.fieldWhat, ActionField.what),
                field(l.doseLabel, ActionField.dose),
                field(l.fieldWhy, ActionField.why),
                field(l.levelShortMin, ActionField.minimum),
                field(l.levelShortNormal, ActionField.normal),
                field(l.levelShortBonus, ActionField.bonus),
                field(l.fieldIfThen, ActionField.ifThen),
              ],
            ),
          ),
          if (a.text(ActionField.safety, lang) case final safety?) ...[
            gap12,
            WCard(
              color: c.rest.bg,
              borderColor: c.rest.bg,
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Icon(Icons.shield_outlined, size: 18, color: c.caption),
                  const SizedBox(width: 8),
                  Expanded(child: Text(safety, style: context.t.small.copyWith(color: c.textSecondary))),
                ],
              ),
            ),
          ],
          gap16,
          SectionLabel(l.sourcesCount('${a.sources.length}')),
          gap8,
          for (final src in a.sources) ...[
            WCard(
              onTap: () => openExternal(context, src.url),
              child: Row(
                children: [
                  Expanded(
                    child: Text(src.title, textDirection: TextDirection.ltr, style: WType.english.small.copyWith(color: c.text)),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.open_in_new_rounded, size: 18, color: c.accentText),
                ],
              ),
            ),
            gap8,
          ],
          Text(l.notASubstitute, style: context.t.caption.copyWith(color: c.caption)),
        ],
      ),
    );
  }
}
