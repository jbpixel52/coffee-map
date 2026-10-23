/** Left detail card for the selected café (Google Maps style), Tamagui content. */
import React from "react";
import { Button, H4, Paragraph, XStack, YStack } from "tamagui";
import {
  escapeHtml,
  gmapsSearchUrl,
  instagramEmbedUrl,
  tiktokSearchUrl,
  tiktokTagSlug,
} from "../lib/popup";
import { foldName } from "../lib/filter";
import type { ShopDetails } from "../lib/details";

interface Props {
  details: ShopDetails | null;
  onClose: () => void;
}

export default function ShopCard({ details, onClose }: Props) {
  const open = details !== null;
  const tag = details ? tiktokTagSlug(details.name) : "";
  const tiktokLink = details ? (
    <a
      className="shop-link tiktok"
      href={tiktokSearchUrl(details.name)}
      title={`Buscar #${tag} en TikTok`}
      target="_blank"
      rel="noopener"
    >
      TikTok #{tag} ↗
    </a>
  ) : null;
  return (
    <div className={`left-sidebar${open ? " open" : ""}`} aria-hidden={!open}>
      <XStack className="sidebar-head" alignItems="center" justifyContent="space-between">
        <H4 size="$5" color="$sidebarTitle" numberOfLines={1} flex={1}>
          {details?.name ?? "Café"}
        </H4>
        <Button chromeless circular size="$3" aria-label="Cerrar" onPress={onClose}>
          ×
        </Button>
      </XStack>
      <YStack className="sidebar-content" gap="$2.5">
        {details && (
          <>
            <YStack gap="$1">
              <Paragraph fontSize={18} fontWeight="700" color="$fg">
                {details.name}
              </Paragraph>
              {details.fullName && foldName(details.fullName) !== foldName(details.name) && (
                <Paragraph fontSize={13} color="$popupFullname">
                  {details.fullName}
                </Paragraph>
              )}
            </YStack>
            {details.handle ? (
              <>
                <Paragraph fontSize={14} fontWeight="600" color="$popupHandle">
                  @{details.handle}
                  {details.followers ? (
                    <Paragraph tag="span" fontSize={12} color="$popupFollowers">
                      {` · ${details.followers} seguidores`}
                    </Paragraph>
                  ) : null}
                </Paragraph>
                <XStack flexWrap="wrap" gap="$2">
                  <a
                    className="shop-link ig"
                    href={`https://www.instagram.com/${encodeURIComponent(details.handle)}/`}
                    target="_blank"
                    rel="noopener"
                  >
                    Instagram ↗
                  </a>
                  <a
                    className="shop-link gmaps"
                    href={gmapsSearchUrl(details.name, details.lat, details.lon)}
                    target="_blank"
                    rel="noopener"
                  >
                    Google Maps ↗
                  </a>
                  {tiktokLink}
                </XStack>
                {(() => {
                  const embed = instagramEmbedUrl(details.code);
                  return embed ? (
                    <iframe
                      className="shop-embed"
                      src={embed}
                      loading="lazy"
                      allowFullScreen
                      scrolling="no"
                      title={`Instagram de ${escapeHtml(details.name)}`}
                    />
                  ) : null;
                })()}
              </>
            ) : (
              <>
                <Paragraph fontSize={13} fontStyle="italic" color="$popupNoIg">
                  Sin Instagram conocido
                </Paragraph>
                <XStack flexWrap="wrap" gap="$2">
                  <a
                    className="shop-link gmaps"
                    href={gmapsSearchUrl(details.name, details.lat, details.lon)}
                    target="_blank"
                    rel="noopener"
                  >
                    Google Maps ↗
                  </a>
                  {tiktokLink}
                </XStack>
              </>
            )}
          </>
        )}
      </YStack>
    </div>
  );
}
