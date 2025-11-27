"use client" 

import * as React from "react"

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";

export type Tag = {
  id: string;
  label: string;
};

type TagsSelectorProps = {
  tags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
};

export function TagsSelector({ tags, selectedTags, onTagsChange }: TagsSelectorProps) {
  const selectedsContainerRef = useRef<HTMLDivElement>(null);

  const removeSelectedTag = (id: string) => {
    onTagsChange(selectedTags.filter((tag) => tag.id !== id));
  };

  const addSelectedTag = (tag: Tag) => {
    if (!selectedTags.some((t) => t.id === tag.id)) {
      onTagsChange([...selectedTags, tag]);
    }
  };

  useEffect(() => {
    if (selectedsContainerRef.current) {
      selectedsContainerRef.current.scrollTo({
        left: selectedsContainerRef.current.scrollWidth,
        behavior: "smooth",
      });
    }
  }, [selectedTags]);

  return (
    <div className="p-1 max-w-lg w-full flex flex-col">
      <motion.div
        className="w-full flex items-center justify-start gap-1.5 bg-white border min-h-14 mt-2 mb-3 overflow-x-auto p-1.5 no-scrollbar"
        style={{
          borderRadius: 16,
        }}
        ref={selectedsContainerRef}
        layout
      >
        {selectedTags.length === 0 && (
          <span className="text-muted-foreground text-sm pl-2">Select teams...</span>
        )}
        {selectedTags.map((tag) => (
          <motion.div
            key={tag.id}
            className="flex items-center gap-1 pl-3 pr-1 py-1 bg-white shadow-md border h-full shrink-0"
            style={{
              borderRadius: 14,
            }}
            layoutId={`tag-${tag.id}`}
          >
            <motion.span
              layoutId={`tag-${tag.id}-label`}
              className="text-gray-700 font-medium text-sm"
            >
              {tag.label}
            </motion.span>
            <button
              type="button"
              onClick={() => removeSelectedTag(tag.id)}
              className="p-1 rounded-full hover:bg-gray-100"
            >
              <X className="size-4 text-gray-500" />
            </button>
          </motion.div>
        ))}
      </motion.div>
      {tags.length > selectedTags.length && (
        <motion.div
          className="bg-white shadow-sm p-2 border w-full"
          style={{
            borderRadius: 16,
          }}
          layout
        >
          <motion.div className="flex flex-wrap gap-2">
            {tags
              .filter(
                (tag) =>
                  !selectedTags.some((selected) => selected.id === tag.id)
              )
              .map((tag) => (
                <motion.button
                  key={tag.id}
                  type="button"
                  layoutId={`tag-${tag.id}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100/60 rounded-full shrink-0 hover:bg-gray-200/60 transition-colors"
                  onClick={() => addSelectedTag(tag)}
                  style={{
                    borderRadius: 14,
                  }}
                >
                  <motion.span
                    layoutId={`tag-${tag.id}-label`}
                    className="text-gray-700 font-medium text-sm"
                  >
                    {tag.label}
                  </motion.span>
                </motion.button>
              ))}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
