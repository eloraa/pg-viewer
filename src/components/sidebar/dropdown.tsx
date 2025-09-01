'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { type Theme, useTheme } from '@/store/theme';
import { OpacityControl } from '@/components/theme/opacity-control';
import { ArrowUpRightIcon, ContrastIcon, EclipseIcon, SearchIcon, SettingsIcon, SunIcon, UserIcon } from 'lucide-react';
import Link from 'next/link';
import * as React from 'react';
import { GithubIcon } from '../ui/icons';

export const Dropdown = () => {
  const { initialized, setTheme, selectedTheme, variant, acrylicOpacity, setAcrylicOpacity } = useTheme();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar className="relative size-8 cursor-pointer">
          <AvatarFallback className="bg-brand-flamingo-primary">
            <UserIcon className="size-4" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-screen max-w-[250px]" align="end">
        <div className="my-2 flex items-center gap-2 px-1.5 overflow-x-hidden">
          <div className="group flex flex-row -space-x-1">
            <Avatar className="size-8 border-transparent group-[.avatars]:border-background rounded-[8px] hover:border-transparent">
              <AvatarFallback className="bg-brand-flamingo-primary rounded-[8px]">
                <UserIcon className="size-4" />
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        <DropdownMenuItem className="flex items-center justify-between">
          <SearchIcon />
          Search
          <div className="ml-auto flex items-center gap-1">
            <Kbd>ctrl</Kbd>
            <Kbd>k</Kbd>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/settings">
            <SettingsIcon />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <ContrastIcon /> Appearance
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={selectedTheme} onValueChange={val => setTheme(val as Theme)}>
                <DropdownMenuRadioItem value="light" disabled={!initialized}>
                  <SunIcon /> Light
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark" disabled={!initialized}>
                  <EclipseIcon /> Dark
                </DropdownMenuRadioItem>
                <DropdownMenuSeparator />
                <DropdownMenuRadioItem value="system" disabled={!initialized}>
                  <ContrastIcon /> System
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <a href="https://github.com/eloraa" target="_blank" rel="noreferrer">
            <GithubIcon /> Github
            <ArrowUpRightIcon className="size-4 ml-auto" />
          </a>
        </DropdownMenuItem>

        {variant === 'acrylic' && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2.5 py-2 my-1 bg-muted rounded-md mt-2">
              <OpacityControl value={acrylicOpacity} onChange={setAcrylicOpacity} majorTickLabelStep={0.1} majorTickInterval={4} minorTicksPerInterval={4} className="[&>div]:!flex-row" />
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
