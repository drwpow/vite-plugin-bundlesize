import React from 'react';
import { createRoot } from 'react-dom/client';
import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client';
import App from './App.js';

const client = new ApolloClient({
	uri: 'https://beta.pokeapi.co/graphql/v1beta',
	cache: new InMemoryCache(),
});

const root = createRoot(document.getElementById('app') as HTMLDivElement);
root.render(
	<ApolloProvider client={client}>
		<App />
	</ApolloProvider>
);
