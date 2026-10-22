/** Dropdown menu listing every café, filterable; select flies to + opens the card. */
import React, { useEffect, useRef, useState } from "react";
import { Input, YStack, Text } from "tamagui";
import { filterShopNames } from "../lib/filter";

interface Props {
  open: boolean;
  names: string[];
  onSelect: (name: string) => void;
  onClose: () => void;
}

export default function ShopMenu({ open, names, onSelect, onClose }: Props) {
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node | null;
      if (rootRef.current && t && !rootRef.current.contains(t)) onClose();
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [open, onClose]);

  const shown = filterShopNames(names, filter);

  return (
    <YStack ref={rootRef} className={`shop-dd${open ? "" : " hidden"}`}>
      <Input
        unstyled
        className="shop-dd-search"
        placeholder="Filtrar lista…"
        value={filter}
        onChangeText={setFilter}
        aria-label="Filtrar lista"
      />
      <YStack tag="ul" id="shop-dd-list" overflowY="auto" flex={1} paddingVertical="$2">
        {shown.map((name) => (
          <Text
            tag="li"
            key={name}
            className="shop-dd-item"
            onPress={() => onSelect(name)}
            cursor="pointer"
          >
            {name}
          </Text>
        ))}
      </YStack>
    </YStack>
  );
}
