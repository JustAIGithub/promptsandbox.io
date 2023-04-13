import { Transition } from '@headlessui/react';
import { FC } from 'react';

import { ChatLoader } from './ChatLoader';
import { ChatMessage } from './ChatMessage';
import { Message } from './types';

interface Props {
	messages: Message[];
	loading: boolean;
}

export const Chat: FC<Props> = ({ messages, loading }) => {
	return (
		<div className="relative h-full overflow-y-scroll">
			<div className="absolute">
				<div className="py-2 grow gap-1 w-full h-full flex flex-col justify-end">
					{messages.map((message, index) => (
						<Transition
							key={index}
							show={true}
							appear={true}
							enter="transform transition duration-[400ms] ease-in-out"
							enterFrom="translate-y-4 opacity-0"
							enterTo="translate-y-0 opacity-100"
							leave="transform transition duration-[400ms] ease-in-out"
							leaveFrom="translate-y-4 opacity-100"
							leaveTo="translate-y-0 opacity-0"
						>
							<ChatMessage message={message} />
						</Transition>
					))}

					{loading && (
						<div className="my-1 sm:my-1.5">
							<ChatLoader />
						</div>
					)}
				</div>
			</div>
		</div>
	);
};