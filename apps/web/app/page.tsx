"use client";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectGroup,
} from "@repo/ui/src/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@repo/ui/src/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@repo/ui/src/tooltip";
import {
  Carousel,
  CarouselItem,
  CarouselContent,
} from "@repo/ui/src/carousel";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@repo/ui/src/chart";
import { getThemeToggler } from "./lib/get-theme-button";
import { Slider } from "@repo/ui/src/slider";
import { SliderThumb } from "@radix-ui/react-slider";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { motion } from 'framer-motion';
import { clearCookie, getReviewedTimeFromCookie, hasSubmittedRecently, latestSubmissionTimeFromCookie, markVenueAsSurveyed, readCookie } from "./lib/cookies/venues";
import { formatDateWithEarlyMorningAdjustment, isBetween8PMand4AMET } from "./lib/time/utils";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis } from "recharts"


import Autoplay from "embla-carousel-autoplay"


export default function Page() {
  const SetThemeButton = getThemeToggler();

  const [venues, setVenues] = useState<any>([]);
  const [selectedVenue, setSelectedVenue] = useState<VenueTypeOption | null>(null);
  const [cookieData, setCookieData] = useState<Record<string, string>>({});
  const [isAdminMode, setIsAdminMode] = useState(false);

  const [votingWindowOpen, setVotingWindowOpen] = useState<boolean>(false);
  const [votingDay, setVotingDay] = useState<string>("");

  const fetchCookieData = () => {
    const data = readCookie();
    setCookieData(data);
  };

  useEffect(() => {
    fetchCookieData();
  }, []);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const isAdmin = searchParams.get('adminMode') !== null;
    setIsAdminMode(isAdmin);
  }, []);

  useEffect(() => {
    const checkTime = () => {
      setVotingWindowOpen(true);
      // No need to prevent voting for now
      // setVotingWindowOpen(isBetween8PMand4AMET(new Date()) || isAdminMode);
    };

    checkTime(); // Check immediately
    const interval = setInterval(checkTime, 60000); // Check every minute

    return () => clearInterval(interval);
  }, [isAdminMode]);

  useEffect(() => {
    async function fetchVenues() {
      try {
        const response = await fetch("/api/venues");
        const data = await response.json();
        setVenues(data);
      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    }
    fetchVenues();
  }, []);

  useEffect(()=> {
    setVotingDay(formatDateWithEarlyMorningAdjustment(new Date()));
  }, [])

  return (
    <main className="flex flex-col items-center justify-start min-h-screen pt-8 px-4">
      <div className="flex max-w-2xl justify-between w-full items-center">
        <SetThemeButton />
        {isAdminMode && <div>
            <button onClick={() => {
              clearCookie()
              setCookieData({});
              setSelectedVenue(null);
            }}>
            Reset Cookie
          </button>
        </div>}
      </div>
      <div className="flex items-center justify-center text-2xl py-4">
          <h1>
            Is it Chill Tonight?  
          </h1>
      </div>
      <div className="flex items-center justify-center text-lg">
          <h3>
            {` ${votingDay}`}
          </h3>
      </div>
      <div className="max-w-2xl text-start w-full mt-8">
        <VenueSelect venues={venues} setSelectedVenue={setSelectedVenue}></VenueSelect>
        {selectedVenue &&
          <Tabs defaultValue="results" className="w-full py-4 mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="results">Results (24 hr)</TabsTrigger>
              <TabsTrigger value="vote">Vote</TabsTrigger>
            </TabsList>
            <TabsContent value="results">
                <VenueSurveyResults venue={selectedVenue} />
            </TabsContent>
            <TabsContent value="vote"> 
                { votingWindowOpen ? (
                    <VenueSurvey 
                      venue={selectedVenue} 
                      refetchCookie={fetchCookieData} 
                      cookieData={cookieData}
                    />
                  ) : (
                    <div className="text-center py-4">Survey opens at 8pm</div>
                  )
                }
            </TabsContent>
          </Tabs>
        }
      </div>
      <div></div>
    </main>
  );
}

interface VenueTypeOption {
  name: string;
  id: string;
  surveyCount: number;
}

function VenueSelect({ venues, setSelectedVenue}: { venues: VenueTypeOption[], setSelectedVenue: any }) {
  return (
    venues && (
      <Select onValueChange={(value) => {
        const selectedVenue = venues.find(venue => venue.id === value);
        setSelectedVenue(selectedVenue);
      }}>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select a venue" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Venues</SelectLabel>
            {venues.map((venue) => {
              const name = venue.surveyCount > 0 ? `🔥 ${venue.name}` : ` ${venue.name}`;
              return (
                <SelectItem key={venue.id} value={venue.id}>{`${name}`}</SelectItem>
              );
            })}
          </SelectGroup>
        </SelectContent>
      </Select>
    )
  );
}

function VenueSurvey({venue, refetchCookie, cookieData}: {venue: VenueTypeOption, refetchCookie: any, cookieData: Record<string, string>}) {
  const venueSurveySchema = z.object({
    mellowOrDancey: z.number().min(0).max(100),
    crowded: z.number().min(0).max(100),
    securityChill: z.number().min(0).max(100),
    ratio: z.number().min(0).max(100),
    lineSpeed: z.number().min(0).max(100),
    comment: z.string().max(200).optional(),
  });

  type VenueSurveyData = z.infer<typeof venueSurveySchema>;

  // The time at which the survey was submitted for this venue
  const d = cookieData[venue.name];
  const surveySubmittedAt = d ? new Date(d) : null;

  // The time at which the survey was most recently submitted
  const latestSubmissionAt = latestSubmissionTimeFromCookie(cookieData);
  const rateLimited = (latestSubmissionAt && (new Date().getTime() - latestSubmissionAt.getTime() < 30 * 60 * 1000)) ? true : false;
  const formDisabled = !!(surveySubmittedAt || rateLimited);


  const form = useForm<VenueSurveyData>({
    resolver: zodResolver(venueSurveySchema),
    defaultValues: {
      mellowOrDancey: Math.floor(Math.random() * 101),
      crowded: Math.floor(Math.random() * 101),
      securityChill: Math.floor(Math.random() * 101),
      ratio: Math.floor(Math.random() * 101),
      lineSpeed: Math.floor(Math.random() * 101),
    },
  });

  useEffect(() => {
    form.reset({
      mellowOrDancey: Math.floor(Math.random() * 101),
      crowded: Math.floor(Math.random() * 101),
      securityChill: Math.floor(Math.random() * 101),
      ratio: Math.floor(Math.random() * 101),
      lineSpeed: Math.floor(Math.random() * 101),
    });
  }, [venue]);

  const onSubmit = (data: VenueSurveyData) => {
    if(venue){
      // Handle form submission
      // POST the form data to /api/surveys
      fetch('/api/surveys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          venueId: venue.id,
          ...data
        }),
      })
      .then(response => response.json())
      .then(result => {
        console.log('Survey submitted successfully:', result);
        // Set a cookie with the submission timestamp
        markVenueAsSurveyed(venue.name);
        // Refetch the cookie for the page
        refetchCookie();
      })
      .catch(error => {
        console.error('Error submitting survey:', error);
        // You can add error handling logic here
      });
    }
  };

  return venue && (
    <>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col py-8 gap-3">
    {
      surveySubmittedAt && <div className="text-sm text-green-300">
        Submitted at {surveySubmittedAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: 'numeric', hour12: true })}
      </div>
    }
    {
      latestSubmissionAt && !(surveySubmittedAt) && (rateLimited) && <div className="text-sm">
        🤠Hold up cowboy, you surveyed another venue too recently. If you happened to invent teleporation email isitchill @ oliverio.dev
      </div>
    }
      <div>
        Mellow or Dance-y?
      </div>
      <div className="flex gap-4 items-center">
        <div className='text-xl'>🌴</div>
        <Controller
          name="mellowOrDancey"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
            className={`${formDisabled ? "cursor-not-allowed": "cursor-pointer"}`}
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              disabled={formDisabled}
            />
          )}
          
        />
        <div className='text-xl'>🕺</div>
      </div>
      <div>
        Crowded?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">👤</div>
        <Controller
          name="crowded"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
            className={`${formDisabled ? "cursor-not-allowed": "cursor-pointer"}`}
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              aria-label="crowded"
              disabled={formDisabled}
            >
              <SliderThumb className="animate-slide-in">
                <div className="absolute top-[-25px] left-1/2 transform -translate-x-1/2 bg-white text-black px-2 py-1 rounded text-xs animate-pop-in">
                  Crowded
                </div>
              </SliderThumb>
            </Slider>
          )}
        />
        <div className="flex">
          <div className="text-xl">👥</div>
        </div>
      </div>
      <div>
        Security Chill?
      </div>
    <div className="flex gap-4 items-center">
        <div className='text-xl'>😎</div>
        <Controller
          name="securityChill"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
            className={`${formDisabled ? "cursor-not-allowed": "cursor-pointer"}`}
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              disabled={formDisabled}
            />
            
          )}
        />
        <div className='text-xl'>🤬</div>
      </div>
      <div>
        Ratio?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">🙋‍♀️</div>
        <Controller
          name="ratio"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
            className={`${formDisabled ? "cursor-not-allowed": "cursor-pointer"}`}
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              aria-label="ratio"
              disabled={formDisabled}
            />
          )}
        />
        <div className="text-xl">🙆‍♂️</div>
      </div>
      <div>
        Line Speed?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">💨</div>
        <Controller
          name="lineSpeed"
          control={form.control}
          render={({ field: { onChange, value } }) => (
            <Slider
              className={`${formDisabled ? "cursor-not-allowed": "cursor-pointer"}`}
              value={[value]}
              onValueChange={(vals) => onChange(vals[0])}
              max={100}
              step={1}
              aria-label="lineSpeed"
              disabled={formDisabled}
            />
          )}
        />
        <div className="text-xl">⏳</div>
      </div>
      <div>
        Comment (optional)
      </div>
      <div className="flex gap-4 items-center">
        <Controller
          name="comment"
          control={form.control}
          render={({ field }) => (
            <textarea
              {...field}
              className={`text-black w-full p-2 border rounded ${formDisabled ? "cursor-not-allowed bg-gray-100" : ""}`}
              placeholder="Enter your comment here..."
              maxLength={200}
              disabled={formDisabled}
            />
          )}
        />
      </div>
      <button 
        type="submit" 
        className={`mt-4 text-white px-4 py-2 rounded ${
          form.formState.isSubmitting || form.formState.isSubmitSuccessful
            ? 'bg-green-500' : !formDisabled ? 
               'bg-blue-500' : 'bg-red-500'
        } ${rateLimited ? "hover:cursor-not-allowed": ""}`}
        disabled={
          form.formState.isSubmitting || 
          form.formState.isSubmitSuccessful || formDisabled
        }
      >
        {form.formState.isSubmitSuccessful ? 'Submitted!' : 'Submit'}
      </button>
    </form>
    </>
  );
}

function VenueSurveyResults({venue} : {venue:VenueTypeOption }){
  const [surveyResults, setSurveyResults] = useState<any>();
  const [eventsToday, setEventsToday] = useState<any>();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const response : any = await fetch(`/api/events?venueId=${venue.id}`);
        if(response){
          const data = await response.json();
          setEventsToday(data.data);
        }

      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    }
    fetchEvents();
  }, [venue])


  useEffect(() => {
    async function fetchSurveyResults() {
      try {
        const response = await fetch(`/api/surveys?venueId=${venue.id}`);
        if(response){
          const data = await response.json();
          setSurveyResults(data);
        }

      } catch (error) {
        console.error("Error fetching venues:", error);
      }
    }
    fetchSurveyResults();
  }, [venue]);
  
  return (surveyResults &&
    <div>
    {eventsToday && eventsToday[0] && 
    <div className="py-4">
    {/* <div className="text-lg">Next event</div> */}
    <div className="flex items-center justify-around text-lg py-4">
      <div>
      {`${new Date(eventsToday[0].startTime).toLocaleDateString('en-US', {month: "long", day: "numeric"})} @ ${new Date(eventsToday[0].startTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`}
      </div>
      <div className="text-right">
        {`${eventsToday[0].title}`}
      </div>
    </div>
    </div>}
    <div className="text-sm text-gray-400">
      {`Showing results from ${surveyResults.count} submissions`} 
    </div>
    <div className="flex flex-col py-4 gap-3">
      <div>
        Mellow or Dance-y?
      </div>
      <div className="flex gap-4 items-center">
        <div className='text-xl'>🌴</div>
        <SurveyResultSlider result={surveyResults.avgMellowOrDancey} label={"mellow"}/>
        <div className='text-xl'>🕺</div>
      </div>
      <div>
        Crowded?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">👤</div>
        <SurveyResultSlider result={surveyResults.avgCrowded} label={"crowded"}/>
        <div className="flex">
          <div className="text-xl">👥</div>
        </div>
      </div>
      <div>
        Security Chill?
      </div>
      <div className="flex gap-4 items-center">
        <div className='text-xl'>😎</div>
        <SurveyResultSlider result={surveyResults.avgSecurityChill} label={"chill"}/>
        <div className='text-xl'>🤬</div>
      </div>
      <div>
        Ratio?
      </div>
      <div className="flex gap-4 items-center">
        <div className="text-xl">🙋‍♀️</div>
        <SurveyResultSlider result={surveyResults.avgRatio} label={"F/M"}/>
        <div className="text-xl">🙆‍♂️</div>
      </div>
      <div>
        Line Speed?
      </div>
      <div className="flex gap-4 items-center">
      <div className="text-xl">💨</div>
        <SurveyResultSlider result={surveyResults.avgLineSpeed} label={"fast"}/>
        <div className="text-xl">⏳</div>
      </div>
    </div>
    {surveyResults.topComments && <div className="flex justify-center items-center">
      <CommentCarousel comments={surveyResults.topComments}/>
    </div>}
    {
      surveyResults.hourlySubmissions && 
        <div className="flex justify-center items-center w-full h-[200px] mt-12">
        <SubmissionGraph hourlySubmissions={surveyResults.hourlySubmissions} />
      </div>
    }
    </div>
  )
}


const SurveyResultSlider = ({ result, label }: {result: number, label: string}) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Simulate data loading
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const resultRounded = Math.round(result);
  const rightSide = resultRounded > 50; 

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
    <div className="w-full mx-auto flex gap-1">
      <motion.div
        className={`h-4 rounded-md shadow-md bg-violet-400`}
        initial={{ width: 0 }}
        animate={{ width: isLoaded ? `${result}%` : 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
      <div className="w-[2px]" /> {/* This creates the 2px gap */}
      <motion.div
        className={`h-4 rounded-md shadow-md bg-yellow-200`}
        initial={{ width: "100%" }}
        animate={{ width: isLoaded ? `${100 - result}%` : "100%" }}
        transition={{ duration: 1, ease: "easeOut" }}
      />
    </div>
    </TooltipTrigger>
    <TooltipContent>
      <p className="text-xxs"><span className="text-md">{`${resultRounded}`}</span>{`% ${label}`}</p>
    </TooltipContent>
    </Tooltip>
    </TooltipProvider>
  );
};

function CommentCarousel({comments} : {comments: any[]}){

  const commentTime = (createdAt: string) => new Date(createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  return (
    <>
    <div className="text-2xl py-2">
      Top Comments
    </div>
    <Carousel
      opts={{
        align: "start",
        loop: true,
      }}
      orientation="vertical"
      className="w-full "
      plugins={[
        Autoplay({
          delay: 2500,
        }),
      ]}
    >
      <CarouselContent className="-mt-1 h-[100px]">
        {comments.map((comment, index) => (

          <CarouselItem key={index} className="pt-1 md:basis-1/2 ">
            <div className="py-1">
                <span className="text-md font-semibold text-violet-400">{`[${commentTime(comment.createdAt)}] ${comment.comment}`}</span>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
      {/* <CarouselPrevious />
      <CarouselNext /> */}
    </Carousel>
    </>
  )

}

const chartConfig = {
  submissionCount: {
    label: "Submission Count",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

function SubmissionGraph({hourlySubmissions}: {hourlySubmissions: any}){
	const tickFormatter = (value: any, index: number) => {
		if(index === 0){
			return "24h"
		} else if (index === hourlySubmissions.length -1) {
			return "Now"
		} else {
    return '';
		}
  };

  return (
    <>
        <ChartContainer config={chartConfig} className="w-full h-[180px] py-4">
          <BarChart
            accessibilityLayer
            data={hourlySubmissions}
            margin={{
              top: 20,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="hour"
              tickLine={false}
              tickMargin={10}
              axisLine={true}
              tickFormatter={tickFormatter}
              padding={{ right: 10, left: 10 }}
              interval={0} // Ensure all ticks are shown
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar dataKey="submissionCount" fill="#A78BFA" radius={8}>
              {/* <LabelList
                position="top"
                offset={12}
                className="fill-foreground"
                fontSize={12}
              /> */}
            </Bar>
          </BarChart>
        </ChartContainer>
      <div className="text-right">
        Pulse Check
      </div>
      </>
  )
}