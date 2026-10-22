/** Floating pill topbar: theme + heat toggles, title, menu, search, IG filter, count. */
import React, { forwardRef } from "react";
import { Button, Input, Text, XStack, Label } from "tamagui";

interface Props {
  dark: boolean;
  onToggleDark: () => void;
  heat: boolean;
  onToggleHeat: () => void;
  query: string;
  onQuery: (q: string) => void;
  onlyIg: boolean;
  onOnlyIg: (v: boolean) => void;
  count: string;
  onOpenMenu: () => void;
}

const TopBar = forwardRef<HTMLDivElement, Props>(function TopBar(
  { dark, onToggleDark, heat, onToggleHeat, query, onQuery, onlyIg, onOnlyIg, count, onOpenMenu },
  ref,
) {
  return (
    <XStack
      ref={ref}
      id="topbar"
      alignItems="center"
      gap="$2.5"
      paddingVertical="$2.5"
      paddingHorizontal="$3.5"
      flexWrap="wrap"
    >
      <Button
        chromeless
        circular
        size="$3"
        title="Cambiar tema"
        aria-label="Cambiar tema"
        onPress={onToggleDark}
      >
        🌓
      </Button>
      <Button
        size="$3"
        theme={heat ? "active" : undefined}
        backgroundColor={heat ? "$accent2" : "$accent"}
        color="white"
        title="Mapa de calor"
        aria-label="Mapa de calor"
        aria-pressed={heat}
        onPress={onToggleHeat}
      >
        🔥
      </Button>
      <Text fontWeight="600" fontSize={15} color="$fg" whiteSpace="nowrap">
        Cafés de Tijuana
      </Text>
      <Button
        chromeless
        circular
        size="$3"
        title="Lista de cafés"
        aria-label="Lista de cafés"
        onPress={onOpenMenu}
      >
        ☰
      </Button>
      <Input
        flex={1}
        minWidth={140}
        size="$3"
        placeholder="Buscar café…"
        value={query}
        onChangeText={onQuery}
        backgroundColor="$inputBg"
        borderColor="$border"
        aria-label="Buscar café"
      />
      <Label
        display="flex"
        alignItems="center"
        gap="$1.5"
        fontSize={12}
        color="$mutedFg"
        whiteSpace="nowrap"
        cursor="pointer"
      >
        <input
          type="checkbox"
          checked={onlyIg}
          onChange={(e) => onOnlyIg(e.target.checked)}
          style={{ width: 14, height: 14, accentColor: "var(--accent)" }}
        />
        Con Instagram
      </Label>
      <Text marginLeft="auto" fontSize={12} color="$mutedFg" whiteSpace="nowrap">
        {count}
      </Text>
    </XStack>
  );
});

export default TopBar;
