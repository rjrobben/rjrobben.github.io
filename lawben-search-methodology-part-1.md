# Deep Research in Hong Kong Law - Part I
Published on June 15, 2025 at 7:39 PM

## Introduction

I always want to automate legal research. Because (1) I always have to do it as a legal student and (2) people often ask me about their legal problems which law school simply doesn't teach.

In the era of AI, this very much sounds like a problem typical [RAG](https://en.wikipedia.org/wiki/Retrieval-augmented_generation) can solve. [This maybe better solved in future with pure LLM-driven approach e.g. the [Self-Retrieval LLM](https://arxiv.org/pdf/2403.00801v2). But not so possible currently, as law is dynamically updated, retraining the LLM every now and then is not quite sensible in terms of costs at the time of this writing.](sidenote).

Now, I understand RAG in simple language as:

>> A system that automatically CTRL-C and CTRL-V something relevant to the question and pass them to LLM for answer generation.


![[blog/2025-09-20_12-13-29.png]]




In our context, we just need to copy the relevant legal principles from a corpus of legal rules, put them into a reasonably intelligent LLM, simple! right?

Turns out it's not. When the pool of documents [pool of documents = Case Law + Legislations in Hong Kong. ~ 150k+ Case Law (~0.5 billion tokens) and ~300k+ legislative sections.](sidenote)  is large, deciding what is relevant becomes a hard problem.

Similarity search with vector embedding is the default position for most RAG system. But, you will note that embedding search has not yet replaced Google. Google will have for sure integrated it, but their search engine is clearly not built on a vector database. There are several functional and non-functional reasons:

1.  performance issue,
2.  cost issue and
3.  that useful information retrieval is a complex field full of nuances [note [the Theoretical Limitations of
Embedding-Based Retrieval](https://arxiv.org/pdf/2508.21038v1)](sidenote).

## The Problem Statement

Any legal advice to me involves a search problem. Given any legal related problem, the first part of the problem solving process is always finding which legal principles are relevant.

Lawyers will call this as identifying the issues. The first step is always identifying the relevant legal frameworks, before that no meaningful legal or factual issues can be laid out.

But the question is: what is relevant?

## What is relevant?

Relevance is multi-dimensional. Assume you carry with you 40g of cocaine, wishing to sell your friend in Thailand, get caught in the HK airport and are charged with Trafficking in Dangerous Drugs (**TDD**). You are now worrying how long you might have to spend on jail.

![TDD illustration](https://media.newyorker.com/photos/590954696552fa0be682cb13/master/w_1920,c_limit/breaking-bad-meth.jpg)

A case can be relevant to your question for various reasons, and on different dimensions:

1.  The age of the offender in that case is similar to you.
2.  It sets out the latest sentencing guideline for TDD in cocaine.
3.  It ruled on the general approach in determining sentence for TDD.
4.  It sets out mitigating factors for reducing sentence generally.
5.  It applied one of the mitigating factors present in your case.
6.  It discussed aggravating factors for increasing sentence generally.
7.  ...

Usually, my search strategy would look something like the following:

1.  Use keywords (e.g. the offence itself) to get a bunch of TDD sentence judgments.
2.  Get a general idea of the sentence range by scanning through the cases.
3.  Stumble across a longer case which looks like a key case of the offence.
4.  Take note.
5.  Scans which case resembles the client’s case at hand, based on different criteria listed above.
6.  Check them out.
7.  Dig out some more cases cited in cases collected so far.
8.  Refine my search based on what I know so far.

“What is relevant” cannot usually be determined with one single search. Instead, multiple search with different purposes has to be performed, which can be tedious to perform.

## Proposed System

To simulate the the human search. There are five main components that I can think of:

1.  keyword search
2.  semantic search
3.  filtering
4.  LLM to use (1) and (2) and (3)
5.  an orchestration framework that search incrementally

Taking references from different deep research workflows proposed by a number of interesting projects, for example:

![Image from Jina.ai, which I come across at [The Differences between Deep Research, Deep Research, and Deep Research](https://leehanchung.github.io/blogs/2025/02/26/deep-research/)](2025-09-20_12-15-39.png)


![Image from Anthropic at [Muti-Agent Research System](https://www.anthropic.com/engineering/built-multi-agent-research-system)](https://www.anthropic.com/_next/image?url=https%3A%2F%2Fwww-cdn.anthropic.com%2Fimages%2F4zrzovbb%2Fwebsite%2F1198befc0b33726c45692ac40f764022f4de1bf2-4584x2579.png&w=3840&q=75 “anthropic image”)


## Eval-first

I am sold by [Eugene Yan](https://eugeneyan.com/writing/llm-patterns/#retrieval-augmented-generation-to-add-knowledge) that evaluation is important for the quality of the system.

>> Building solid evals should be the starting point for any LLM-based system or product.
>> <footer>Eugene Yan</footer>
 

Curating high quality evaluation dataset is costly. But, ~100 data points can already provide a less subjective evaluation of the system.

The evaluation method I chose is the [Nugget Recall](https://arxiv.org/pdf/2504.15068). In simple terms, nugget is an atomic fact that should be included in an answer. Hence, we can measure the performance by counting how many “nuggets” an answer to a query contains compared to the standard list of nuggets curated by expert that should appear in relation to a query.

![Image from the linked paper.](blog/2025-09-20_12-17-31.png “recall image”)

## Filtering

The limitation of vector similarity search is that the bigger the search pool, the harder to retrieve relevant result.

![An intuitive explanation is that the bigger the document pool, the set of relevant documents become a smaller fraction of the total pool, and get easily crowded out by other marginally relevant results.](blog/2025-09-20_12-17-52.png “filter image”)


The strategy we use to mitigate such limitation is simple: filtering [Another approach is to boost the discriminative power of the embedding model over a larger set of documents. Pure ml approach. Problem: need ample gpu resources and high quality dataset. We will see if we can do this later.](sidenote). Based on the query or user input, the first step we should do is to narrow down the search space.

There are multiple approaches for efficient filtering that has come to my knowledge:

1.  Filter by Tag
2.  Semantic IDs

_Filter by Tag_ by only picking cases with tag matching the target topic, judgment type, court or offence.

But someone has to come up with the tags. Generating accurate and meaningful tag is feasible with LLM but relatively slow. Suppose it would take at least ~10s for 1 case to generate high-quality metadata. Now, 100K case means 1M seconds = 11 days, if performed consecutively!

![The giant table of content](blog/2025-09-20_12-18-19.png “taxonomy viewer”)


[_Semantic IDs_](https://arxiv.org/abs/2306.08121) is an interesting approach explored by Google Deepmind for Youtube’s recommendation system. It is not exactly related to filtering but my intuition convinced me it seems relevant. 

A semantic ID is a compact numerical sequence representation of an item’s hierarchical information (e.g. an 8-byte sequence that captures 8 levels and 256 topics) using the trie concept . The semantic ID is learned from the dense vector embedding of an item with an architecture called the RQ-VAE to quantize the content embedding into a discrete representation.

This is useful for a stage 2 training, which uses the Semantic IDs as the inputs to train another model which learn user behaviors. An IDs based approach captured the semantic learning while addressed the problem of lack of memorization ability (i.e. to remember a particular video is revealing to certain group of users) of content-based embedding (not as unique as ID). 

![[blog/2025-08-05_14-26-07.png]]

![Image from the linked paper](blog/2025-09-20_12-18-53.png “paper link”)

The problem of Semantic IDs approach in our use case is that it is designed for item-to-item comparison; whereas what our use case needs is a query-to-item mapping. Even the semantic IDs are in place, the question of how do we map the query to the semantic IDs space remains unresolved.

However, imo the trie based Semantic IDs concept is inspiring:

**pros**
- it organizes the items into hierarchical topics
- it represents the hierarchical information very compactly for each item, either the implemented discrete representation, or the conceptual equivalent of using concatenated string: `criminal_law, sexual_offence, indecent_assualt, ...`
- it supports hierarchical retrieval based on topics traversal at different level of granularity depending on the needs.

**cons**
- only one topic at each level, but items sometimes share multiple topic even within the same level.
- if implementing the unsupervised approach from the paper, takes time.
- if using self-modified approach which only captures the concept of a semantic ID, the topic allocation at each level needs a classifier.

## Conclusion

In this article, I have discussed the problem I want to solve in legal research and outlined my approach to the problem. In the next article, I will discuss the two of the other components of the system, i.e. keyword search and similarity search.

___

    