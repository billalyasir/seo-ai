"use client";
import React from "react";
import dynamic from "next/dynamic";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { Play } from "lucide-react";

// Load ReactPlayer dynamically on the client side
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

const VideoModal = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative cursor-pointer inline-block text-lg group">
          <span className="relative z-10 block px-5 py-3 overflow-hidden font-medium leading-tight text-gray-800 transition-colors duration-300 ease-out border-2 border-gray-900 rounded-lg group-hover:text-white">
            <span className="absolute inset-0 w-full h-full px-5 py-3 rounded-lg bg-gray-50"></span>
            <span className="absolute left-0 w-48 h-48 -ml-2 transition-all duration-300 origin-top-right -rotate-90 -translate-x-full translate-y-12 bg-gray-900 group-hover:-rotate-180 ease"></span>
            <span className="relative flex items-center gap-2">
              How It Works ? <Play className="h-4 w-4" />
            </span>
          </span>
          <span
            className="absolute bottom-0 right-0 w-full h-12 -mb-1 -mr-1 transition-all duration-200 ease-linear bg-gray-900 rounded-lg group-hover:mb-0 group-hover:mr-0"
            data-rounded="rounded-lg"
          ></span>{" "}
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl w-[92vw]">
        <DialogHeader>
          <DialogTitle>How It Works</DialogTitle>
          <DialogDescription>
            Watch this short video to see the product in action.
          </DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-xl shadow-sm">
          <ReactPlayer
            src="https://youtu.be/OjIqa61paIE"
            width="100%"
            height="100%"
            controls
            playsinline
            config={{ youtube: { playerVars: { rel: 0 } } }}
          />
        </div>
        <DialogFooter className="mt-4">
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;
